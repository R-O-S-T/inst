import { logger } from '../utils/logger.js';

// TODO: Replace stubs with real @unlink-xyz/sdk calls once the package is installed.
// See /tmp/deps-needed.txt for the required dependency.

/**
 * Generate a new Unlink wallet mnemonic and derive the corresponding Unlink address.
 */
export async function generateUserMnemonic(): Promise<{ mnemonic: string; unlinkAddress: string }> {
  try {
    // TODO: Use Unlink SDK to generate a real mnemonic + address, e.g.:
    //   import { Wallet } from '@unlink-xyz/sdk';
    //   const wallet = Wallet.generate();
    //   return { mnemonic: wallet.mnemonic, unlinkAddress: wallet.address };

    logger.warn('generateUserMnemonic: Using stub — install @unlink-xyz/sdk for real implementation');

    // Placeholder values for development
    const fakeMnemonic = 'test test test test test test test test test test test junk';
    const fakeAddress = `unlink1${Date.now().toString(36)}stub`;

    return { mnemonic: fakeMnemonic, unlinkAddress: fakeAddress };
  } catch (err) {
    logger.error('generateUserMnemonic failed', err);
    throw err;
  }
}

/**
 * Transfer tokens from the platform/escrow Unlink wallet to a user's Unlink address.
 * Returns the transaction hash.
 */
export async function transferToUser(
  recipientUnlinkAddress: string,
  amount: string,
  token: string,
): Promise<string> {
  try {
    // TODO: Use Unlink SDK to execute the transfer, e.g.:
    //   import { Wallet, Transfer } from '@unlink-xyz/sdk';
    //   const escrowWallet = Wallet.fromMnemonic(process.env.UNLINK_ESCROW_MNEMONIC!);
    //   const tx = await Transfer.send({
    //     from: escrowWallet,
    //     to: recipientUnlinkAddress,
    //     amount,
    //     token,
    //   });
    //   return tx.hash;

    logger.warn('transferToUser: Using stub — install @unlink-xyz/sdk for real implementation');
    logger.info(`transferToUser stub: to=${recipientUnlinkAddress} amount=${amount} token=${token}`);

    return `0xstub_tx_${Date.now().toString(16)}`;
  } catch (err) {
    logger.error(`transferToUser failed: to=${recipientUnlinkAddress} amount=${amount} token=${token}`, err);
    throw err;
  }
}

/**
 * Query the balance of an Unlink address. Returns the balance as a string.
 */
export async function getBalance(unlinkAddress: string): Promise<string> {
  try {
    // TODO: Use Unlink SDK to query the real balance, e.g.:
    //   import { Query } from '@unlink-xyz/sdk';
    //   const balance = await Query.getBalance(unlinkAddress);
    //   return balance.toString();

    logger.warn('getBalance: Using stub — install @unlink-xyz/sdk for real implementation');
    logger.debug(`getBalance stub: address=${unlinkAddress}`);

    return '0';
  } catch (err) {
    logger.error(`getBalance failed: address=${unlinkAddress}`, err);
    throw err;
  }
}
