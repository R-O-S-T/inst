/**
 * Safe smart account lifecycle hook.
 *
 * On first login: computes counterfactual Safe address, persists it,
 * deploys the Safe in the background via Pimlico bundler + paymaster.
 *
 * On subsequent logins: loads the persisted Safe address, creates a
 * smart account client, reads on-chain owners.
 *
 * The Safe address is deterministic: same owner + saltNonce = same address.
 * It's valid for receiving funds even before deployment.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Account, Chain, Transport, WalletClient } from 'viem';
import type { SmartAccountClient } from 'permissionless';

import { createSafeClient, publicClient } from '../lib/safe-client';
import { getSafeOwners, getSafeThreshold } from '../lib/rotate';

const SAFE_ADDRESS_KEY = '@instant/safe-address';
const SAFE_DEPLOYED_KEY = '@instant/safe-deployed';

type SafeSigner = WalletClient<Transport, Chain, Account>;

export function useSafe(signer: SafeSigner | null) {
  const [safeAddress, setSafeAddress] = useState<`0x${string}` | null>(null);
  const [smartAccountClient, setSmartAccountClient] = useState<SmartAccountClient | null>(null);
  const [owners, setOwners] = useState<`0x${string}`[]>([]);
  const [threshold, setThreshold] = useState<bigint>(1n);
  const [isDeployed, setIsDeployed] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initStartedRef = useRef(false);

  // ── Initialize Safe client ──

  useEffect(() => {
    if (!signer || initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Check for existing Safe address
        const storedAddress = await AsyncStorage.getItem(SAFE_ADDRESS_KEY);
        const storedDeployed = await AsyncStorage.getItem(SAFE_DEPLOYED_KEY);

        if (storedAddress) {
          // Returning user — load existing Safe
          console.log('[useSafe] Loading existing Safe:', storedAddress);

          const result = await createSafeClient(
            signer,
            storedAddress as `0x${string}`,
          );

          if (cancelled) return;

          setSafeAddress(storedAddress as `0x${string}`);
          setSmartAccountClient(result.smartAccountClient);
          setIsDeployed(storedDeployed === 'true');

          // Read owners if deployed
          if (storedDeployed === 'true') {
            try {
              const onChainOwners = await getSafeOwners(
                publicClient,
                storedAddress as `0x${string}`,
              );
              const onChainThreshold = await getSafeThreshold(
                publicClient,
                storedAddress as `0x${string}`,
              );
              if (!cancelled) {
                setOwners(onChainOwners);
                setThreshold(onChainThreshold);
              }
            } catch (err) {
              console.warn('[useSafe] Failed to read owners (Safe may not be deployed yet)');
            }
          }
        } else {
          // New user — compute counterfactual address
          console.log('[useSafe] New user — computing Safe address');

          const result = await createSafeClient(signer);

          if (cancelled) return;

          const address = result.safeAddress;
          console.log('[useSafe] Counterfactual Safe address:', address);

          // Persist immediately (valid for receiving before deployment)
          await AsyncStorage.setItem(SAFE_ADDRESS_KEY, address);

          setSafeAddress(address);
          setSmartAccountClient(result.smartAccountClient);

          // Deploy in background
          setIsDeploying(true);
          console.log('[useSafe] Starting background deployment...');

          try {
            // First UserOp triggers Safe deployment via initCode
            const deployHash = await result.smartAccountClient.sendTransaction({
              to: address,
              data: '0x',
              value: 0n,
            });

            console.log('[useSafe] Deploy tx:', deployHash);
            await AsyncStorage.setItem(SAFE_DEPLOYED_KEY, 'true');

            if (!cancelled) {
              setIsDeployed(true);

              // Read owners after deployment
              const onChainOwners = await getSafeOwners(publicClient, address);
              setOwners(onChainOwners);
            }
          } catch (deployErr: any) {
            console.error('[useSafe] Background deployment failed:', deployErr?.message);
            // Non-fatal — Safe address is still valid for receiving
            // Deployment will be retried on next send
            if (!cancelled) {
              setError(`Deployment pending: ${deployErr?.message}`);
            }
          } finally {
            if (!cancelled) setIsDeploying(false);
          }
        }
      } catch (err: any) {
        console.error('[useSafe] Init failed:', err?.message);
        if (!cancelled) {
          setError(err?.message || 'Failed to initialize Safe');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signer]);

  // ── Refresh owners from on-chain ──

  const refreshOwners = useCallback(async () => {
    if (!safeAddress) return;

    try {
      const onChainOwners = await getSafeOwners(publicClient, safeAddress);
      const onChainThreshold = await getSafeThreshold(publicClient, safeAddress);
      setOwners(onChainOwners);
      setThreshold(onChainThreshold);
    } catch (err) {
      console.warn('[useSafe] Failed to refresh owners:', err);
    }
  }, [safeAddress]);

  // ── Reset (for logout) ──

  const reset = useCallback(() => {
    initStartedRef.current = false;
    setSafeAddress(null);
    setSmartAccountClient(null);
    setOwners([]);
    setIsDeployed(false);
    setIsDeploying(false);
    setIsLoading(true);
    setError(null);
  }, []);

  return {
    safeAddress,
    smartAccountClient,
    owners,
    threshold,
    isDeployed,
    isDeploying,
    isLoading,
    error,
    refreshOwners,
    reset,
  };
}
