import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchUserBalance } from '../services/api';

const POLL_INTERVAL_MS = 15_000;

export function useBalance(walletAddress: string | null) {
  const [evmBalance, setEvmBalance] = useState<string>('0');
  const [unlinkBalance, setUnlinkBalance] = useState<string>('0');
  const [unlinkAddress, setUnlinkAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest walletAddress in a ref so the interval callback never
  // captures a stale closure.
  const addressRef = useRef(walletAddress);
  addressRef.current = walletAddress;

  const refetch = useCallback(async () => {
    const addr = addressRef.current;
    if (!addr) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchUserBalance(addr);
      setEvmBalance(data.evmBalance);
      setUnlinkBalance(data.unlinkBalance);
      setUnlinkAddress(data.unlinkAddress);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!walletAddress) return;

    // Fetch immediately on mount / address change
    refetch();

    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [walletAddress, refetch]);

  return { evmBalance, unlinkBalance, unlinkAddress, isLoading, error, refetch };
}
