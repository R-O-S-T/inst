import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, formatEther, formatUnits, erc20Abi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { TOKENS } from '../services/unlinkClient';

const POLL_INTERVAL_MS = 15_000;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export type TokenBalances = Record<string, string>; // symbol → formatted balance

export function useBalance(walletAddress: string | null) {
  const [balances, setBalances] = useState<TokenBalances>({});
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
      const results: TokenBalances = {};

      // Fetch all balances in parallel
      const promises = TOKENS.map(async (token) => {
        if (token.isNative) {
          const raw = await publicClient.getBalance({ address: addr as `0x${string}` });
          results[token.symbol] = formatEther(raw);
        } else {
          const raw = await publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [addr as `0x${string}`],
          });
          results[token.symbol] = formatUnits(raw, token.decimals);
        }
      });

      await Promise.all(promises);
      setBalances(results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
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

  return { balances, isLoading, error, refetch };
}
