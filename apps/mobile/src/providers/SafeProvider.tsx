/**
 * SafeProvider — shares Safe state across all screens.
 *
 * Initializes the Safe client once (when the Dynamic wallet is available),
 * then provides safeAddress, smartAccountClient, etc. to all children.
 */
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { baseSepolia } from 'viem/chains';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Account, Chain, Transport, WalletClient } from 'viem';
import type { SmartAccountClient } from 'permissionless';

import { dynamicClient } from '../../client';
import { useWallet } from '../hooks/useWallet';
import { createSafeClient, publicClient } from '../lib/safe-client';
import { getSafeOwners, getSafeThreshold } from '../lib/rotate';

const SAFE_ADDRESS_KEY = '@instant/safe-address';
const SAFE_DEPLOYED_KEY = '@instant/safe-deployed';

interface SafeContextValue {
  safeAddress: `0x${string}` | null;
  smartAccountClient: SmartAccountClient | null;
  owners: `0x${string}`[];
  threshold: bigint;
  isDeployed: boolean;
  isDeploying: boolean;
  isLoading: boolean;
  error: string | null;
  refreshOwners: () => Promise<void>;
}

const SafeContext = createContext<SafeContextValue>({
  safeAddress: null,
  smartAccountClient: null,
  owners: [],
  threshold: 1n,
  isDeployed: false,
  isDeploying: false,
  isLoading: true,
  error: null,
  refreshOwners: async () => {},
});

export function useSafeContext() {
  return useContext(SafeContext);
}

export function SafeProvider({ children }: { children: React.ReactNode }) {
  const { wallets, isAuthenticated } = useWallet();
  const wallet = wallets[0];

  const [safeAddress, setSafeAddress] = useState<`0x${string}` | null>(null);
  const [smartAccountClient, setSmartAccountClient] = useState<SmartAccountClient | null>(null);
  const [owners, setOwners] = useState<`0x${string}`[]>([]);
  const [threshold, setThreshold] = useState<bigint>(1n);
  const [isDeployed, setIsDeployed] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initStartedRef = useRef(false);

  useEffect(() => {
    if (!wallet || !isAuthenticated || initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get viem WalletClient from Dynamic
        const signer = await dynamicClient.viem.createWalletClient({
          wallet,
          chain: baseSepolia,
        });

        // Check for existing Safe
        const storedAddress = await AsyncStorage.getItem(SAFE_ADDRESS_KEY);
        const storedDeployed = await AsyncStorage.getItem(SAFE_DEPLOYED_KEY);

        if (storedAddress) {
          console.log('[SafeProvider] Loading existing Safe:', storedAddress);

          const result = await createSafeClient(signer, storedAddress as `0x${string}`);
          if (cancelled) return;

          setSafeAddress(storedAddress as `0x${string}`);
          setSmartAccountClient(result.smartAccountClient);
          setIsDeployed(storedDeployed === 'true');

          if (storedDeployed === 'true') {
            try {
              const ownersResult = await getSafeOwners(publicClient, storedAddress as `0x${string}`);
              const thresholdResult = await getSafeThreshold(publicClient, storedAddress as `0x${string}`);
              if (!cancelled) {
                setOwners(ownersResult);
                setThreshold(thresholdResult);
              }
            } catch {
              console.warn('[SafeProvider] Could not read owners');
            }
          }
        } else {
          console.log('[SafeProvider] New user — computing Safe address');

          const result = await createSafeClient(signer);
          if (cancelled) return;

          const address = result.safeAddress;
          console.log('[SafeProvider] Counterfactual Safe:', address);

          await AsyncStorage.setItem(SAFE_ADDRESS_KEY, address);
          setSafeAddress(address);
          setSmartAccountClient(result.smartAccountClient);

          // Deploy in background
          setIsDeploying(true);
          try {
            const hash = await result.smartAccountClient.sendTransaction({
              to: address,
              data: '0x',
              value: 0n,
            });
            console.log('[SafeProvider] Deploy tx:', hash);
            await AsyncStorage.setItem(SAFE_DEPLOYED_KEY, 'true');

            if (!cancelled) {
              setIsDeployed(true);
              const ownersResult = await getSafeOwners(publicClient, address);
              setOwners(ownersResult);
            }
          } catch (err: any) {
            console.error('[SafeProvider] Deploy failed:', err?.message);
            if (!cancelled) setError(`Deploy pending: ${err?.message}`);
          } finally {
            if (!cancelled) setIsDeploying(false);
          }
        }
      } catch (err: any) {
        console.error('[SafeProvider] Init failed:', err?.message);
        if (!cancelled) setError(err?.message || 'Safe init failed');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [wallet, isAuthenticated]);

  const refreshOwners = useCallback(async () => {
    if (!safeAddress) return;
    try {
      const ownersResult = await getSafeOwners(publicClient, safeAddress);
      const thresholdResult = await getSafeThreshold(publicClient, safeAddress);
      setOwners(ownersResult);
      setThreshold(thresholdResult);
    } catch (err) {
      console.warn('[SafeProvider] refreshOwners failed:', err);
    }
  }, [safeAddress]);

  return (
    <SafeContext.Provider
      value={{
        safeAddress,
        smartAccountClient,
        owners,
        threshold,
        isDeployed,
        isDeploying,
        isLoading,
        error,
        refreshOwners,
      }}
    >
      {children}
    </SafeContext.Provider>
  );
}
