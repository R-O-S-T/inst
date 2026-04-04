import { createUnlink, unlinkAccount, unlinkEvm } from '@unlink-xyz/sdk';
import type { WalletClient, PublicClient } from 'viem';

// ── Supported tokens on Base Sepolia ──────────────────────────────────
export interface TokenInfo {
  symbol: string;
  address: string; // ERC-20 contract address, empty string for native ETH
  decimals: number;
  isNative?: boolean;
}

export const TOKENS: TokenInfo[] = [
  { symbol: 'ETH', address: '', decimals: 18, isNative: true },
  { symbol: 'ULNKm', address: '0x7501de8ea37a21e20e6e65947d2ecab0e9f061a7', decimals: 18 },
  { symbol: 'USDC', address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 },
];

export const TOKEN_BY_SYMBOL: Record<string, TokenInfo> = Object.fromEntries(
  TOKENS.map((t) => [t.symbol, t]),
);

// Default Unlink pool token
export const ULNKM = TOKEN_BY_SYMBOL['ULNKm'];

// ── Unlink SDK ────────────────────────────────────────────────────────
import { UNLINK_API_KEY } from '../config/secrets';

const ENGINE_URL = 'https://staging-api.unlink.xyz';

export function createUnlinkFromSeed(
  walletClient: WalletClient,
  publicClient: PublicClient,
  seed: Uint8Array,
) {
  return createUnlink({
    engineUrl: ENGINE_URL,
    apiKey: UNLINK_API_KEY,
    account: unlinkAccount.fromSeed({ seed }),
    evm: unlinkEvm.fromViem({ walletClient, publicClient }),
  });
}

export { ENGINE_URL };
