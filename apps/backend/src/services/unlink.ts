import {
  createUnlink,
  unlinkAccount,
  unlinkEvm,
} from '@unlink-xyz/sdk';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { logger } from '../utils/logger.js';

// ── Constants ─────────────────────────────────────────────────────────
const ENGINE_URL = 'https://staging-api.unlink.xyz';
const TOKEN = '0x7501de8ea37a21e20e6e65947d2ecab0e9f061a7'; // ULNKm on Base Sepolia

// ── Shared EVM infrastructure ─────────────────────────────────────────
function getEvmProvider() {
  const privateKey = process.env.EVM_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error('EVM_PRIVATE_KEY not set');

  const transport = http(process.env.RPC_URL || 'https://sepolia.base.org');
  const evmAccount = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({ chain: baseSepolia, transport });
  const walletClient = createWalletClient({ account: evmAccount, chain: baseSepolia, transport });

  return { publicClient, walletClient, evmAccount };
}

function makeUnlinkClient(mnemonic: string) {
  const { publicClient, walletClient } = getEvmProvider();

  return createUnlink({
    engineUrl: ENGINE_URL,
    apiKey: process.env.UNLINK_API_KEY!,
    account: unlinkAccount.fromMnemonic({ mnemonic }),
    evm: unlinkEvm.fromViem({ walletClient, publicClient }),
  });
}

// ── Exported functions ────────────────────────────────────────────────

/**
 * Generate a new mnemonic and derive the Unlink address.
 * Also registers the user with the Unlink backend.
 */
export async function generateUserMnemonic(): Promise<{ mnemonic: string; unlinkAddress: string }> {
  try {
    const mnemonic = generateMnemonic(wordlist);
    const client = makeUnlinkClient(mnemonic);

    const unlinkAddress = await client.getAddress();
    await client.ensureRegistered();

    logger.info(`Generated Unlink wallet: ${unlinkAddress}`);
    return { mnemonic, unlinkAddress };
  } catch (err) {
    logger.error('generateUserMnemonic failed', err);
    throw err;
  }
}

/**
 * Private transfer from a sender's Unlink pool to a recipient Unlink address.
 * Sender, recipient, amount, and token are ALL private on-chain.
 */
export async function transferToUser(
  senderMnemonic: string,
  recipientUnlinkAddress: string,
  amount: string,
): Promise<string> {
  try {
    const client = makeUnlinkClient(senderMnemonic);
    await client.ensureRegistered();

    logger.info(`Private transfer: to=${recipientUnlinkAddress} amount=${amount}`);

    const result = await client.transfer({
      recipientAddress: recipientUnlinkAddress,
      token: TOKEN,
      amount,
    });

    logger.info(`Transfer submitted: txId=${result.txId}`);

    const confirmed = await client.pollTransactionStatus(result.txId);
    logger.info(`Transfer status: ${confirmed.status}`);

    return result.txId;
  } catch (err) {
    logger.error(`transferToUser failed: to=${recipientUnlinkAddress}`, err);
    throw err;
  }
}

/**
 * Query the Unlink pool balance for a given mnemonic.
 * Returns formatted balance string.
 */
export async function getBalance(mnemonic: string): Promise<string> {
  try {
    const client = makeUnlinkClient(mnemonic);
    const balances = await client.getBalances({ token: TOKEN });

    const entry = balances.balances?.find(
      (b: { token: string }) => b.token.toLowerCase() === TOKEN.toLowerCase()
    );

    const raw = BigInt(entry?.amount ?? '0');
    return formatUnits(raw, 18);
  } catch (err) {
    logger.error('getBalance failed', err);
    throw err;
  }
}

/**
 * Deposit ERC-20 tokens from the EVM wallet into a user's Unlink pool.
 */
export async function depositToPool(
  mnemonic: string,
  amount: string,
): Promise<string> {
  try {
    const client = makeUnlinkClient(mnemonic);
    const { publicClient } = getEvmProvider();

    await client.ensureRegistered();

    // Ensure ERC-20 approval for Unlink pool
    const approval = await client.ensureErc20Approval({ token: TOKEN, amount });
    if (approval.status === 'submitted') {
      logger.info(`ERC-20 approval tx: ${approval.txHash}`);
      await publicClient.waitForTransactionReceipt({
        hash: approval.txHash as `0x${string}`,
      });
    }

    const result = await client.deposit({ token: TOKEN, amount });
    logger.info(`Deposit submitted: txId=${result.txId}`);

    const confirmed = await client.pollTransactionStatus(result.txId);
    logger.info(`Deposit status: ${confirmed.status}`);

    return result.txId;
  } catch (err) {
    logger.error('depositToPool failed', err);
    throw err;
  }
}

/**
 * Withdraw from Unlink pool to a public EVM address.
 * Sender is PRIVATE, recipient and amount are PUBLIC.
 */
export async function withdrawToEvm(
  mnemonic: string,
  recipientEvmAddress: string,
  amount: string,
): Promise<string> {
  try {
    const client = makeUnlinkClient(mnemonic);
    await client.ensureRegistered();

    const result = await client.withdraw({
      recipientEvmAddress,
      token: TOKEN,
      amount,
    });

    logger.info(`Withdraw submitted: txId=${result.txId}`);

    const confirmed = await client.pollTransactionStatus(result.txId);
    logger.info(`Withdraw status: ${confirmed.status}`);

    return result.txId;
  } catch (err) {
    logger.error(`withdrawToEvm failed: to=${recipientEvmAddress}`, err);
    throw err;
  }
}

// ── Gift wallet operations ───────────────────────────────────────────

/**
 * Generate a throwaway Unlink wallet for a gift link.
 * The mnemonic is stored in the DB (for refunds) and encoded in the QR.
 */
export async function generateGiftWallet(): Promise<{ mnemonic: string; unlinkAddress: string }> {
  try {
    const mnemonic = generateMnemonic(wordlist);
    const client = makeUnlinkClient(mnemonic);

    const unlinkAddress = await client.getAddress();
    await client.ensureRegistered();

    logger.info(`Generated gift wallet: ${unlinkAddress}`);
    return { mnemonic, unlinkAddress };
  } catch (err) {
    logger.error('generateGiftWallet failed', err);
    throw err;
  }
}

/**
 * Transfer funds from a gift wallet to a recipient.
 * Used for refunds (cancel flow): gift wallet → sender's Unlink address.
 */
export async function transferFromGiftWallet(
  giftMnemonic: string,
  recipientUnlinkAddress: string,
  amount: string,
): Promise<string> {
  try {
    const client = makeUnlinkClient(giftMnemonic);
    await client.ensureRegistered();

    logger.info(`Gift wallet transfer: to=${recipientUnlinkAddress} amount=${amount}`);

    const result = await client.transfer({
      recipientAddress: recipientUnlinkAddress,
      token: TOKEN,
      amount,
    });

    logger.info(`Gift transfer submitted: txId=${result.txId}`);

    const confirmed = await client.pollTransactionStatus(result.txId);
    logger.info(`Gift transfer status: ${confirmed.status}`);

    return result.txId;
  } catch (err) {
    logger.error(`transferFromGiftWallet failed: to=${recipientUnlinkAddress}`, err);
    throw err;
  }
}

/**
 * Check the balance of a gift wallet.
 */
export async function getGiftWalletBalance(giftMnemonic: string): Promise<string> {
  try {
    const client = makeUnlinkClient(giftMnemonic);
    const balances = await client.getBalances({ token: TOKEN });

    const entry = balances.balances?.find(
      (b: { token: string }) => b.token.toLowerCase() === TOKEN.toLowerCase()
    );

    const raw = BigInt(entry?.amount ?? '0');
    return formatUnits(raw, 18);
  } catch (err) {
    logger.error('getGiftWalletBalance failed', err);
    throw err;
  }
}

export { TOKEN, ENGINE_URL };
