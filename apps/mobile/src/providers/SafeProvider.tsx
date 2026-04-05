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
import { createSafeClient, getPublicClient } from '../lib/safe-client';
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
    console.log('[SafeProvider] Check:', { wallet: !!wallet, isAuthenticated, initStarted: initStartedRef.current });
    if (!wallet || !isAuthenticated || initStartedRef.current) return;
    initStartedRef.current = true;
    console.log('[SafeProvider] Init starting...');

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

          setSafeAddress(storedAddress as `0x${string}`);
          setSmartAccountClient(result.smartAccountClient);
          setIsDeployed(storedDeployed === 'true');
          setIsLoading(false);
          console.log('[SafeProvider] Safe client ready');

          // Read owners in background (non-blocking)
          if (storedDeployed === 'true') {
            getSafeOwners(getPublicClient(), storedAddress as `0x${string}`)
              .then((ownersResult) => {
                setOwners(ownersResult);
              })
              .catch(() => console.warn('[SafeProvider] Could not read owners'));
            getSafeThreshold(getPublicClient(), storedAddress as `0x${string}`)
              .then((t) => {
                setThreshold(t);
              })
              .catch(() => {});
          }
        } else {
          console.log('[SafeProvider] New user — computing Safe address');

          const result = await createSafeClient(signer);


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

            {
              setIsDeployed(true);
              const ownersResult = await getSafeOwners(getPublicClient(), address);
              setOwners(ownersResult);
            }
          } catch (err: any) {
            console.error('[SafeProvider] Deploy failed:', err?.message);
            setError(`Deploy pending: ${err?.message}`);
          } finally {
            setIsDeploying(false);
          }
        }
      } catch (err: any) {
        console.error('[SafeProvider] Init failed:', err?.message);
        setError(err?.message || 'Safe init failed');
      } finally {
        setIsLoading(false);
      }
    })();

  }, [wallet, isAuthenticated]);

  const refreshOwners = useCallback(async () => {
    if (!safeAddress) return;
    try {
      const ownersResult = await getSafeOwners(getPublicClient(), safeAddress);
      const thresholdResult = await getSafeThreshold(getPublicClient(), safeAddress);
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
