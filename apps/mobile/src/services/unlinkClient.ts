import { createUnlink, unlinkAccount, unlinkEvm } from '@unlink-xyz/sdk';
import type { WalletClient, PublicClient } from 'viem';

// ULNKm token on Base Sepolia
export const TOKEN = '0x7501de8ea37a21e20e6e65947d2ecab0e9f061a7';

const ENGINE_URL = 'https://staging-api.unlink.xyz';
const UNLINK_API_KEY = 'Mmx3ZqMRowptK5kSMAHqa7';

/**
 * Create an Unlink SDK client from a derived seed (Uint8Array).
 * The seed is derived from the Dynamic wallet via signMessage("unlink-seed-v1").
 */
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

export { ENGINE_URL, UNLINK_API_KEY };
