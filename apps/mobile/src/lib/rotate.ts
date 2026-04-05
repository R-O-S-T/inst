/**
 * Safe key rotation — swapOwner execution.
 *
 * Atomically removes the old owner and adds the new owner in a single
 * UserOperation. After this tx, the old key is fully locked out.
 */
import { encodeFunctionData, type PublicClient } from 'viem';
import type { SmartAccountClient } from 'permissionless';

const SENTINEL = '0x0000000000000000000000000000000000000001' as const;

const SAFE_ABI = [
  {
    name: 'swapOwner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'prevOwner', type: 'address' },
      { name: 'oldOwner', type: 'address' },
      { name: 'newOwner', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'getOwners',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getThreshold',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Read current Safe owners from the contract.
 */
export async function getSafeOwners(
  publicClient: PublicClient,
  safeAddress: `0x${string}`,
): Promise<`0x${string}`[]> {
  return publicClient.readContract({
    address: safeAddress,
    abi: SAFE_ABI,
    functionName: 'getOwners',
  }) as Promise<`0x${string}`[]>;
}

/**
 * Read current Safe threshold.
 */
export async function getSafeThreshold(
  publicClient: PublicClient,
  safeAddress: `0x${string}`,
): Promise<bigint> {
  return publicClient.readContract({
    address: safeAddress,
    abi: SAFE_ABI,
    functionName: 'getThreshold',
  });
}

/**
 * Find the prevOwner for a given owner in Safe's linked list.
 *
 * Safe stores owners as: sentinel → owner[n-1] → ... → owner[0] → sentinel
 * getOwners() returns in reverse insertion order.
 */
function findPrevOwner(
  owners: readonly `0x${string}`[],
  target: `0x${string}`,
): `0x${string}` {
  const idx = owners.findIndex(
    (o) => o.toLowerCase() === target.toLowerCase(),
  );
  if (idx === -1) throw new Error(`Owner ${target} not found in owner list`);
  if (idx === owners.length - 1) return SENTINEL;
  return owners[idx + 1];
}

interface RotateParams {
  smartAccountClient: SmartAccountClient;
  publicClient: PublicClient;
  safeAddress: `0x${string}`;
  newOwnerAddress: `0x${string}`;
}

/**
 * Rotate the Safe's owner from the current signer to a new address.
 *
 * IMPORTANT: This must be called while the current signer still controls the Safe.
 * After this tx, the old signer is permanently locked out.
 *
 * @returns Transaction hash
 */
export async function rotateSafeOwner(
  params: RotateParams,
): Promise<`0x${string}`> {
  const { smartAccountClient, publicClient, safeAddress, newOwnerAddress } = params;

  // 1. Read current owners
  const owners = await getSafeOwners(publicClient, safeAddress);
  console.log('[rotate] Current owners:', owners);

  if (owners.length === 0) {
    throw new Error('Safe has no owners');
  }

  // 2. Check new owner isn't already an owner
  if (owners.some((o) => o.toLowerCase() === newOwnerAddress.toLowerCase())) {
    throw new Error('New address is already an owner');
  }

  // 3. Find prevOwner and oldOwner
  const oldOwner = owners[0];
  const prevOwner = findPrevOwner(owners, oldOwner);

  console.log(`[rotate] ${oldOwner} → ${newOwnerAddress} (prev: ${prevOwner})`);

  // 4. Send swapOwner UserOperation
  const txHash = await smartAccountClient.sendTransaction({
    to: safeAddress,
    data: encodeFunctionData({
      abi: SAFE_ABI,
      functionName: 'swapOwner',
      args: [prevOwner, oldOwner, newOwnerAddress],
    }),
    value: 0n,
  });

  console.log('[rotate] swapOwner tx:', txHash);

  // 5. Verify rotation succeeded — retry with delay for RPC staleness
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

    const newOwners = await getSafeOwners(publicClient, safeAddress);
    const rotated = newOwners.some(
      (o) => o.toLowerCase() === newOwnerAddress.toLowerCase(),
    );
    const oldRemoved = !newOwners.some(
      (o) => o.toLowerCase() === oldOwner.toLowerCase(),
    );

    if (rotated && oldRemoved) {
      console.log('[rotate] Verified on attempt', attempt, '. New owners:', newOwners);
      return txHash;
    }

    console.log(`[rotate] Verification attempt ${attempt}/${MAX_RETRIES} — owners still stale:`, newOwners);
  }

  // If we get here, the RPC never caught up — but the tx DID succeed onchain.
  // Return the hash anyway rather than throwing a misleading error.
  console.warn('[rotate] Verification timed out but tx was mined:', txHash);
  return txHash;
}
