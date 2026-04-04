/**
 * Safe smart account client factory via permissionless.js + Pimlico.
 *
 * Creates a 1-of-1 Safe (v1.4.1) with ERC-4337 (EntryPoint v0.7).
 * Pimlico acts as bundler + paymaster (sponsors gas on testnets).
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type Transport,
  type WalletClient,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { entryPoint07Address } from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { PIMLICO_API_KEY } from '../config/secrets';

const CHAIN = baseSepolia;
const RPC_URL = 'https://sepolia.base.org';
const PIMLICO_URL = `https://api.pimlico.io/v2/${CHAIN.id}/rpc?apikey=${PIMLICO_API_KEY}`;

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

const pimlicoClient = createPimlicoClient({
  transport: http(PIMLICO_URL),
  entryPoint: {
    address: entryPoint07Address,
    version: '0.7',
  },
});

/**
 * Create a Safe smart account client from a viem-compatible signer.
 *
 * The signer can be:
 * - A Dynamic embedded wallet account (from dynamicClient.viem.createWalletClient())
 * - An image-derived key (from createSignerFromPrivateKey())
 *
 * @param signer - A viem WalletClient or Account that can sign messages/txs
 * @param existingSafeAddress - If the Safe is already deployed, pass its address
 */
export async function createSafeClient(
  signer: WalletClient<Transport, Chain, Account>,
  existingSafeAddress?: `0x${string}`,
) {
  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7',
    },
    owners: [signer],
    version: '1.4.1',
    saltNonce: 0n,
    ...(existingSafeAddress ? { address: existingSafeAddress } : {}),
  });

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain: CHAIN,
    bundlerTransport: http(PIMLICO_URL),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });

  return {
    safeAccount,
    smartAccountClient,
    safeAddress: (existingSafeAddress ?? safeAccount.address) as `0x${string}`,
  };
}

/**
 * Create a viem WalletClient from a raw private key.
 * Used for the image-key login path (no Dynamic involved).
 */
export function createSignerFromPrivateKey(
  privateKey: `0x${string}`,
): WalletClient<Transport, Chain, Account> {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: CHAIN,
    transport: http(RPC_URL),
  });
}
