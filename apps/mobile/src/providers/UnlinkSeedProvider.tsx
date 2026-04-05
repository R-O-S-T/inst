/**
 * UnlinkSeedProvider -- provides an optional external seed to useUnlink.
 *
 * When image-auth is active, the decrypted Unlink seed is passed here
 * so that useUnlink() can pick it up without changing its call sites.
 */
import React, { createContext, useContext } from 'react';

interface UnlinkSeedContextValue {
  externalSeed: Uint8Array | null;
}

const UnlinkSeedContext = createContext<UnlinkSeedContextValue>({
  externalSeed: null,
});

export function useUnlinkSeedContext(): UnlinkSeedContextValue {
  return useContext(UnlinkSeedContext);
}

interface UnlinkSeedProviderProps {
  children: React.ReactNode;
  externalSeed?: Uint8Array | null;
}

export function UnlinkSeedProvider({ children, externalSeed }: UnlinkSeedProviderProps) {
  return (
    <UnlinkSeedContext.Provider value={{ externalSeed: externalSeed ?? null }}>
      {children}
    </UnlinkSeedContext.Provider>
  );
}
