/**
 * Public send hook — routes transactions through the Safe smart account.
 *
 * For native ETH: sendTransaction({ to, value })
 * For ERC-20: sendTransaction({ to: tokenAddress, data: transfer calldata })
 */
import { useCallback } from 'react';
import { parseUnits, parseEther, encodeFunctionData, erc20Abi } from 'viem';
import type { SmartAccountClient } from 'permissionless';
import { TOKEN_BY_SYMBOL } from '../services/unlinkClient';

export function useSendTransaction(smartAccountClient: SmartAccountClient | null) {
  const sendPublic = useCallback(
    async (to: string, amount: string, tokenSymbol: string): Promise<string> => {
      if (!smartAccountClient) throw new Error('Safe wallet not ready');

      const token = TOKEN_BY_SYMBOL[tokenSymbol];
      if (!token) throw new Error(`Unknown token: ${tokenSymbol}`);

      if (token.isNative) {
        const hash = await smartAccountClient.sendTransaction({
          to: to as `0x${string}`,
          value: parseEther(amount),
        });
        return hash;
      } else {
        const hash = await smartAccountClient.sendTransaction({
          to: token.address as `0x${string}`,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [to as `0x${string}`, parseUnits(amount, token.decimals)],
          }),
          value: 0n,
        });
        return hash;
      }
    },
    [smartAccountClient],
  );

  return { sendPublic };
}
