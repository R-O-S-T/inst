import { useReactiveClient } from '@dynamic-labs/react-hooks';
import { dynamicClient } from '../../client';

export function useWallet() {
  const client = useReactiveClient(dynamicClient);

  const wallets = client.wallets.userWallets;
  const address = wallets[0]?.address ?? null;
  const isAuthenticated = client.auth.authenticatedUser !== null;
  const isLoading = !client.sdk.loaded;

  const createWallet = () => client.wallets.embedded.createWallet();
  const logout = () => client.auth.logout();

  return {
    address,
    isAuthenticated,
    isLoading,
    wallets,
    createWallet,
    logout,
  };
}
