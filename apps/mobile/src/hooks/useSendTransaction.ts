import { useCallback } from 'react';
import { dynamicClient } from '../../client';
import { useWallet } from './useWallet';
import { TOKEN } from '../services/unlinkClient';

/**
 * Hook that exposes `sendPublic` for on-chain sends via Dynamic's sendBalance API.
 * Supports both native ETH and ERC-20 tokens (ULNKm).
 */
export function useSendTransaction() {
  const { wallets } = useWallet();

  const sendPublic = useCallback(
    async (to: string, amount: string, token: 'ETH' | 'ULNKm' = 'ETH'): Promise<string> => {
      const wallet = wallets[0];
      if (!wallet) {
        throw new Error('No wallet connected');
      }

      const params: Parameters<typeof dynamicClient.wallets.sendBalance>[0] = {
        wallet,
        amount,
        toAddress: to,
      };

      // For ERC-20 tokens, pass the token address + decimals
      if (token === 'ULNKm') {
        params.token = {
          address: TOKEN,
          decimals: 18,
        };
      }

      const result = await dynamicClient.wallets.sendBalance(params);
      return result.hash;
    },
    [wallets],
  );

  return { sendPublic };
}
