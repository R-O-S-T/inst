import { logger } from '../utils/logger.js';

// TODO: Replace stubs with real @dynamic-labs-wallet/sdk calls once the package is installed.
// See /tmp/deps-needed.txt for the required dependency.

/**
 * Get or create the escrow server wallet via Dynamic.
 * Returns the wallet address.
 */
export async function getOrCreateEscrowWallet(): Promise<{ address: string }> {
  try {
    // TODO: Use Dynamic server wallet SDK, e.g.:
    //   import { DynamicServerWallet } from '@dynamic-labs-wallet/sdk';
    //   const client = new DynamicServerWallet({
    //     apiKey: process.env.DYNAMIC_API_KEY!,
    //     environmentId: process.env.DYNAMIC_ENVIRONMENT_ID!,
    //   });
    //   const wallet = await client.getOrCreateWallet({ name: 'escrow' });
    //   return { address: wallet.address };

    logger.warn('getOrCreateEscrowWallet: Using stub — install @dynamic-labs-wallet/sdk for real implementation');

    const address = process.env.ESCROW_WALLET_ADDRESS ?? '0x0000000000000000000000000000000000000000';
    return { address };
  } catch (err) {
    logger.error('getOrCreateEscrowWallet failed', err);
    throw err;
  }
}

/**
 * Send tokens from the escrow wallet to a destination address.
 * Returns the transaction hash.
 */
export async function sendFromEscrow(to: string, amount: string): Promise<string> {
  try {
    // TODO: Use Dynamic server wallet SDK, e.g.:
    //   import { DynamicServerWallet } from '@dynamic-labs-wallet/sdk';
    //   const client = new DynamicServerWallet({
    //     apiKey: process.env.DYNAMIC_API_KEY!,
    //     environmentId: process.env.DYNAMIC_ENVIRONMENT_ID!,
    //   });
    //   const tx = await client.sendTransaction({
    //     walletName: 'escrow',
    //     to,
    //     value: amount,
    //   });
    //   return tx.hash;

    logger.warn('sendFromEscrow: Using stub — install @dynamic-labs-wallet/sdk for real implementation');
    logger.info(`sendFromEscrow stub: to=${to} amount=${amount}`);

    return `0xstub_escrow_tx_${Date.now().toString(16)}`;
  } catch (err) {
    logger.error(`sendFromEscrow failed: to=${to} amount=${amount}`, err);
    throw err;
  }
}
