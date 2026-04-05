import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toBytes } from 'viem';
import type { Account, Chain, Transport, WalletClient } from 'viem';

import { deriveKeyFromImage } from '../lib/image-key';
import { createSignerFromPrivateKey, getPublicClient } from '../lib/safe-client';
import { loadEncryptedSeed, decryptUnlinkSeed } from '../lib/unlink-seed-handoff';
import { getSafeOwners } from '../lib/rotate';

// Same key format as SafeProvider
function safeAddressKey(ownerAddress: string) {
  return `@instant/safe-address-${ownerAddress.toLowerCase()}`;
}

export interface UseImageAuthReturn {
  isImageAuthenticated: boolean;
  imageAddress: `0x${string}` | null;
  imageSigner: WalletClient<Transport, Chain, Account> | null;
  unlinkSeed: Uint8Array | null;
  loginWithImage: (imageBytes: Uint8Array, password?: string) => Promise<void>;
  logoutImage: () => void;
}

/**
 * Hook for image-based key authentication.
 *
 * Derives a keypair from an image file, locates the user's existing Safe,
 * and decrypts the Unlink seed for private transfers.
 *
 * The private key is NEVER persisted -- the user must re-select the image each time.
 */
export function useImageAuth(): UseImageAuthReturn {
  const [isImageAuthenticated, setIsImageAuthenticated] = useState(false);
  const [imageAddress, setImageAddress] = useState<`0x${string}` | null>(null);
  const [imageSigner, setImageSigner] = useState<WalletClient<Transport, Chain, Account> | null>(null);
  const [unlinkSeed, setUnlinkSeed] = useState<Uint8Array | null>(null);

  const loginWithImage = useCallback(async (imageBytes: Uint8Array, password?: string) => {
    // 1. Derive keypair from image
    const keyResult = deriveKeyFromImage(imageBytes, password);
    console.log('[useImageAuth] Derived address:', keyResult.address, 'fingerprint:', keyResult.fingerprint);

    // 2. Create signer from the derived private key
    const signer = createSignerFromPrivateKey(keyResult.privateKey);

    // 3. Find a Safe for this address
    //    First check the direct key (image address was the original creator)
    let safeAddress: `0x${string}` | null = null;

    const directKey = safeAddressKey(keyResult.address);
    const directSafe = await AsyncStorage.getItem(directKey);

    if (directSafe) {
      safeAddress = directSafe as `0x${string}`;
      console.log('[useImageAuth] Found Safe via direct key:', safeAddress);
    } else {
      // Post-rotation case: Safe was created by a different EOA but the
      // image-derived address was added as an owner via swapOwner.
      // Scan ALL stored safe addresses and check on-chain ownership.
      console.log('[useImageAuth] No direct Safe found, scanning all stored Safes...');
      const allKeys = await AsyncStorage.getAllKeys();
      const safeKeys = allKeys.filter((k) => k.startsWith('@instant/safe-address-'));

      const publicClient = getPublicClient();

      for (const key of safeKeys) {
        const candidateAddress = await AsyncStorage.getItem(key);
        if (!candidateAddress) continue;

        try {
          const owners = await getSafeOwners(publicClient, candidateAddress as `0x${string}`);
          const isOwner = owners.some(
            (o) => o.toLowerCase() === keyResult.address.toLowerCase(),
          );
          if (isOwner) {
            safeAddress = candidateAddress as `0x${string}`;
            console.log('[useImageAuth] Found Safe via owner scan:', safeAddress);
            break;
          }
        } catch (err) {
          // Safe might not be deployed yet -- skip
          console.warn('[useImageAuth] Could not read owners for', candidateAddress, err);
        }
      }
    }

    if (!safeAddress) {
      throw new Error(
        'No Safe found for this image. You must first create a Safe with email login, then rotate ownership to your image key.',
      );
    }

    // 4. Load and decrypt the Unlink seed
    let decryptedSeed: Uint8Array | null = null;

    const encryptedSeedHex = await loadEncryptedSeed();
    if (encryptedSeedHex) {
      try {
        // Convert the hex private key to raw bytes for decryption
        const privateKeyBytes = toBytes(keyResult.privateKey);
        decryptedSeed = decryptUnlinkSeed(encryptedSeedHex, privateKeyBytes);
        console.log('[useImageAuth] Unlink seed decrypted successfully');
      } catch (err) {
        console.warn('[useImageAuth] Failed to decrypt Unlink seed:', err);
        // Non-fatal: user can still use the wallet without Unlink
      }
    } else {
      console.warn('[useImageAuth] No encrypted Unlink seed found in storage');
    }

    // 5. Set state
    setImageAddress(keyResult.address);
    setImageSigner(signer);
    setUnlinkSeed(decryptedSeed);
    setIsImageAuthenticated(true);

    console.log('[useImageAuth] Login complete');
  }, []);

  const logoutImage = useCallback(() => {
    setIsImageAuthenticated(false);
    setImageAddress(null);
    setImageSigner(null);
    setUnlinkSeed(null);
    console.log('[useImageAuth] Logged out');
  }, []);

  return {
    isImageAuthenticated,
    imageAddress,
    imageSigner,
    unlinkSeed,
    loginWithImage,
    logoutImage,
  };
}
