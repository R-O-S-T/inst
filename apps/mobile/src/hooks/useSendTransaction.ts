import { useCallback } from 'react';
import { parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { dynamicClient } from '../../client';
import { useWallet } from './useWallet';

/**
 * Hook that exposes a `sendPublic` function for sending ETH
 * on-chain via Dynamic's viem wallet client.
 */
export function useSendTransaction() {
  const { wallets } = useWallet();

  const sendPublic = useCallback(
    async (to: string, amount: string): Promise<string> => {
      const wallet = wallets[0];
      if (!wallet) {
        throw new Error('No wallet connected');
      }

      const walletClient = await dynamicClient.viem.createWalletClient({
        wallet,
        chain: baseSepolia,
      });

      const hash = await walletClient.sendTransaction({
        to: to as `0x${string}`,
        value: parseEther(amount),
        chain: baseSepolia,
      });

      return hash;
    },
    [wallets],
  );

  return { sendPublic };
}
