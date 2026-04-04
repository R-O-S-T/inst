import { useCallback } from 'react';
import { parseUnits, parseEther, erc20Abi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { dynamicClient } from '../../client';
import { useWallet } from './useWallet';
import { TOKEN_BY_SYMBOL } from '../services/unlinkClient';

export function useSendTransaction() {
  const { wallets } = useWallet();

  const sendPublic = useCallback(
    async (to: string, amount: string, tokenSymbol: string): Promise<string> => {
      const wallet = wallets[0];
      if (!wallet) throw new Error('No wallet connected');

      const token = TOKEN_BY_SYMBOL[tokenSymbol];
      if (!token) throw new Error(`Unknown token: ${tokenSymbol}`);

      const walletClient = await dynamicClient.viem.createWalletClient({
        wallet,
        chain: baseSepolia,
      });

      if (token.isNative) {
        // Native ETH transfer
        const hash = await walletClient.sendTransaction({
          to: to as `0x${string}`,
          value: parseEther(amount),
          chain: baseSepolia,
        });
        return hash;
      } else {
        // ERC-20 transfer
        const hash = await walletClient.writeContract({
          address: token.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [to as `0x${string}`, parseUnits(amount, token.decimals)],
          chain: baseSepolia,
        });
        return hash;
      }
    },
    [wallets],
  );

  return { sendPublic };
}
