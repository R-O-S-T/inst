/**
 * Safe smart account client factory via permissionless.js + Pimlico.
 *
 * All permissionless imports are lazy (dynamic import) to avoid
 * module-scope crashes in React Native.
 *
 * The Dynamic walletClient is wrapped via toAccount() so permissionless
 * gets a local-style account and doesn't call eth_requestAccounts.
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
import { privateKeyToAccount, toAccount } from 'viem/accounts';
import { PIMLICO_API_KEY } from '../config/secrets';

const CHAIN = baseSepolia;
const RPC_URL = 'https://sepolia.base.org';
const ENTRY_POINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

function getPimlicoUrl() {
  return `https://api.pimlico.io/v2/${CHAIN.id}/rpc?apikey=${PIMLICO_API_KEY}`;
}

let _publicClient: ReturnType<typeof createPublicClient> | null = null;
export function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
  }
  return _publicClient;
}

/**
 * Wrap a Dynamic walletClient into a local-style viem Account.
 * This prevents permissionless from calling eth_requestAccounts.
 */
function wrapDynamicSigner(signer: WalletClient<Transport, Chain, Account>) {
  const account = signer.account;
  if (!account) throw new Error('Signer has no account');

  return toAccount({
    address: account.address,
    async signMessage({ message }) {
      return signer.signMessage({ account, message });
    },
    async signTypedData(typedData) {
      return signer.signTypedData({ account, ...typedData } as any);
    },
    async signTransaction(tx) {
      return signer.signTransaction({ account, ...tx } as any);
    },
  });
}

/**
 * Create a Safe smart account client from a viem-compatible signer.
 */
export async function createSafeClient(
  signer: WalletClient<Transport, Chain, Account>,
  existingSafeAddress?: `0x${string}`,
) {
  // Lazy imports
  const { toSafeSmartAccount } = await import('permissionless/accounts');
  const { createSmartAccountClient } = await import('permissionless');
  const { createPimlicoClient } = await import('permissionless/clients/pimlico');

  const publicClient = getPublicClient();
  const pimlicoUrl = getPimlicoUrl();

  const pimlicoClient = createPimlicoClient({
    transport: http(pimlicoUrl),
    entryPoint: {
      address: ENTRY_POINT_ADDRESS,
      version: '0.7',
    },
  });

  // Wrap signer so permissionless doesn't call eth_requestAccounts
  const localAccount = wrapDynamicSigner(signer);

  console.log('[safe-client] Creating Safe, owner:', localAccount.address);

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    entryPoint: {
      address: ENTRY_POINT_ADDRESS,
      version: '0.7',
    },
    owners: [localAccount],
    version: '1.4.1',
    saltNonce: 0n,
    ...(existingSafeAddress ? { address: existingSafeAddress } : {}),
  });

  console.log('[safe-client] Safe address:', safeAccount.address);

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain: CHAIN,
    bundlerTransport: http(pimlicoUrl),
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
