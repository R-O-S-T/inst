import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';

const POLL_INTERVAL_MS = 15_000;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

/**
 * Fetches on-chain EVM balance for the given wallet address.
 *
 * Unlink balance and address are now managed by `useUnlink` and passed
 * through separately by the navigator; this hook no longer stubs them.
 */
export function useBalance(walletAddress: string | null) {
  const [evmBalance, setEvmBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addressRef = useRef(walletAddress);
  addressRef.current = walletAddress;

  const refetch = useCallback(async () => {
    const addr = addressRef.current;
    if (!addr) return;

    setIsLoading(true);
    setError(null);

    try {
      const rawBalance = await publicClient.getBalance({
        address: addr as `0x${string}`,
      });
      setEvmBalance(formatEther(rawBalance));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!walletAddress) return;

    refetch();

    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [walletAddress, refetch]);

  return { evmBalance, isLoading, error, refetch };
}
