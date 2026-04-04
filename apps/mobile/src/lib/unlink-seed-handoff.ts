/**
 * Unlink seed handoff — encrypt/decrypt the Unlink seed during key rotation.
 *
 * During rotation (old key → new key), the Unlink seed is:
 * 1. Derived from the old key (signMessage)
 * 2. Encrypted with a key derived from the new private key
 * 3. Stored in AsyncStorage
 *
 * On image-key login, the seed is:
 * 1. Loaded from AsyncStorage
 * 2. Decrypted with the image-derived private key
 * 3. Passed to the Unlink SDK as an external seed
 *
 * This preserves the same Unlink identity across auth methods.
 */
import { sha256 } from '@noble/hashes/sha256';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@instant/encrypted-unlink-seed';

/**
 * XOR two equal-length byte arrays. Simple symmetric encryption when
 * the key is derived from a private key (unpredictable to anyone without it).
 */
function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) throw new Error('XOR: arrays must be same length');
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derive the encryption key from an image-derived private key.
 * SHA-256 of the private key bytes — only someone with the image can compute this.
 */
function deriveEncryptionKey(imagePrivateKey: Uint8Array): Uint8Array {
  return sha256(imagePrivateKey);
}

/**
 * Encrypt the Unlink seed with the image-derived private key.
 * Returns a hex string.
 */
export function encryptUnlinkSeed(
  seed: Uint8Array,
  imagePrivateKey: Uint8Array,
): string {
  if (seed.length !== 32) throw new Error('Seed must be 32 bytes');
  const key = deriveEncryptionKey(imagePrivateKey);
  return toHex(xorBytes(seed, key));
}

/**
 * Decrypt the Unlink seed using the image-derived private key.
 * Returns the original 32-byte seed.
 */
export function decryptUnlinkSeed(
  encrypted: string,
  imagePrivateKey: Uint8Array,
): Uint8Array {
  const encryptedBytes = fromHex(encrypted);
  if (encryptedBytes.length !== 32) throw new Error('Encrypted seed must be 32 bytes');
  const key = deriveEncryptionKey(imagePrivateKey);
  return xorBytes(encryptedBytes, key);
}

/**
 * Store the encrypted Unlink seed in AsyncStorage.
 */
export async function storeEncryptedSeed(encrypted: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, encrypted);
  console.log('[seed-handoff] Encrypted seed stored');
}

/**
 * Load the encrypted Unlink seed from AsyncStorage.
 * Returns null if no seed is stored.
 */
export async function loadEncryptedSeed(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

/**
 * Clear the stored encrypted seed (e.g., on app reset).
 */
export async function clearEncryptedSeed(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
