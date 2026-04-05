/**
 * Deterministic key derivation from an image file.
 *
 * Pipeline:
 *   image bytes → SHA-256 → (optional PBKDF2 with password) → entropy
 *   → BIP39 mnemonic → seed → HD key at m/44'/60'/0'/0/0
 *   → private key → address
 *
 * Same image + same password always produces the same key.
 */
import { sha256 } from '@noble/hashes/sha256';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { HDKey } from '@scure/bip32';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { privateKeyToAccount } from 'viem/accounts';

const DERIVATION_PATH = "m/44'/60'/0'/0/0";
export const PBKDF2_ITERATIONS = 3_000; // low for hackathon demo; production: 210_000

function toHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export interface ImageKeyResult {
  mnemonic: string;
  privateKey: `0x${string}`;
  address: `0x${string}`;
  fingerprint: string;
}

/**
 * Derive an Ethereum keypair from raw image bytes.
 */
export function deriveKeyFromImage(
  imageBytes: Uint8Array,
  password?: string,
): ImageKeyResult {
  const imageHash = sha256(imageBytes);
  const fingerprint = Array.from(imageHash.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  let entropy: Uint8Array;
  if (password && password.length > 0) {
    const encoder = new TextEncoder();
    entropy = pbkdf2(sha256, encoder.encode(password), imageHash, {
      c: PBKDF2_ITERATIONS,
      dkLen: 32,
    });
  } else {
    entropy = imageHash;
  }

  const mnemonic = entropyToMnemonic(entropy, wordlist);
  const seed = mnemonicToSeedSync(mnemonic);
  const master = HDKey.fromMasterSeed(seed);
  const child = master.derive(DERIVATION_PATH);

  if (!child.privateKey) {
    throw new Error('Failed to derive private key from image');
  }

  const privateKey = toHex(child.privateKey);
  const account = privateKeyToAccount(privateKey);

  return {
    mnemonic,
    privateKey,
    address: account.address,
    fingerprint,
  };
}
