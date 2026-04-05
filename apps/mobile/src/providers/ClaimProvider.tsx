/**
 * ClaimProvider — persists gift claim parameters across app restarts.
 *
 * When a receiver scans a gift QR, the claim code + entropy are captured
 * from the deep link and stored here. If the app restarts during signup,
 * the params are recovered from AsyncStorage. Also checks clipboard for
 * deferred deep links (copied by the web landing page).
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

const STORAGE_KEY = '@instant/pending-claim';

export interface PendingClaim {
  claimCode: string;
  entropyHex: string;
}

interface ClaimContextValue {
  pendingClaim: PendingClaim | null;
  setClaimParams: (claimCode: string, entropyHex: string) => void;
  clearClaim: () => void;
}

const ClaimContext = createContext<ClaimContextValue>({
  pendingClaim: null,
  setClaimParams: () => {},
  clearClaim: () => {},
});

export function useClaimContext() {
  return useContext(ClaimContext);
}

export function ClaimProvider({ children }: { children: React.ReactNode }) {
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);

  // Recover persisted claim on mount, then check clipboard for deferred deep link
  useEffect(() => {
    (async () => {
      // 1. Check AsyncStorage first (survives app restart)
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PendingClaim;
          if (parsed.claimCode && parsed.entropyHex) {
            setPendingClaim(parsed);
            console.log('[ClaimProvider] recovered pending claim:', parsed.claimCode);
            return;
          }
        } catch {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }

      // 2. Check clipboard for deferred deep link (copied by landing page)
      try {
        const text = await Clipboard.getStringAsync();
        if (text?.startsWith('instant://claim/')) {
          const parsed = Linking.parse(text);
          const claimCode = parsed.path?.replace('claim/', '') ?? '';
          const entropyHex = (parsed.queryParams?.e as string) ?? '';
          if (claimCode && entropyHex) {
            console.log('[ClaimProvider] found claim in clipboard:', claimCode);
            const claim = { claimCode, entropyHex };
            setPendingClaim(claim);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(claim));
            await Clipboard.setStringAsync('');
          }
        }
      } catch (err) {
        console.warn('[ClaimProvider] clipboard check failed:', err);
      }
    })();
  }, []);

  const setClaimParams = useCallback((claimCode: string, entropyHex: string) => {
    const claim = { claimCode, entropyHex };
    setPendingClaim(claim);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(claim));
    console.log('[ClaimProvider] set pending claim:', claimCode);
  }, []);

  const clearClaim = useCallback(() => {
    setPendingClaim(null);
    AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[ClaimProvider] cleared pending claim');
  }, []);

  return (
    <ClaimContext.Provider value={{ pendingClaim, setClaimParams, clearClaim }}>
      {children}
    </ClaimContext.Provider>
  );
}
