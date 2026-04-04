import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, sha256, toBytes } from 'viem';
import { baseSepolia } from 'viem/chains';

import { dynamicClient } from '../../client';
import { useWallet } from './useWallet';
import { createUnlinkFromSeed, TOKEN } from '../services/unlinkClient';

const BALANCE_POLL_MS = 30_000;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

type UnlinkClient = ReturnType<typeof createUnlinkFromSeed>;

/**
 * Hook that manages an Unlink SDK client tied to the current Dynamic wallet.
 *
 * The Unlink seed is DERIVED from the Dynamic wallet via signMessage("unlink-seed-v1").
 * No mnemonic is stored — same wallet always produces same Unlink identity.
 */
export function useUnlink() {
  const { wallets } = useWallet();

  const [unlinkAddress, setUnlinkAddress] = useState<string>('');
  const [unlinkBalance, setUnlinkBalance] = useState<string>('0');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<UnlinkClient | null>(null);
  const initStartedRef = useRef(false);

  // ---- helpers ----

  const refreshBalance = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    try {
      const balances = await client.getBalances({ token: TOKEN });
      const entry = balances.balances?.find(
        (b: any) => b.token.toLowerCase() === TOKEN.toLowerCase(),
      );
      const raw = BigInt(entry?.amount ?? '0');
      const whole = raw / 10n ** 18n;
      const frac = raw % 10n ** 18n;
      const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
      const formatted = fracStr ? `${whole}.${fracStr}` : whole.toString();
      setUnlinkBalance(formatted);
    } catch (err: unknown) {
      console.warn('[useUnlink] balance fetch failed', err);
    }
  }, []);

  // ---- derive seed + init client ----

  useEffect(() => {
    const wallet = wallets[0];
    if (!wallet || initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        // 1. Create viem walletClient from Dynamic
        const walletClient = await dynamicClient.viem.createWalletClient({
          wallet,
          chain: baseSepolia,
        });

        // 2. Derive Unlink seed from Dynamic wallet signature
        //    Same wallet + same message = same signature = same Unlink identity
        const signature = await dynamicClient.wallets.signMessage({
          wallet,
          message: 'unlink-seed-v1',
        });
        const seed = toBytes(sha256(toBytes(signature)));

        if (cancelled) return;

        // 3. Create Unlink client from derived seed
        const client = createUnlinkFromSeed(walletClient, publicClient, seed);
        clientRef.current = client;

        // 4. Register + get address
        await client.ensureRegistered();
        const addr = await client.getAddress();

        if (cancelled) return;

        setUnlinkAddress(addr);
        setIsReady(true);

        await refreshBalance();
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unlink init failed');
          console.error('[useUnlink] init error', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallets, refreshBalance]);

  // ---- balance polling ----

  useEffect(() => {
    if (!isReady) return;
    const id = setInterval(refreshBalance, BALANCE_POLL_MS);
    return () => clearInterval(id);
  }, [isReady, refreshBalance]);

  // ---- actions ----

  const deposit = useCallback(async (amount: string): Promise<string> => {
    const client = clientRef.current;
    if (!client) throw new Error('Unlink client not ready');

    const approval = await client.ensureErc20Approval({ token: TOKEN, amount });
    if (approval.status === 'submitted') {
      await publicClient.waitForTransactionReceipt({
        hash: approval.txHash as `0x${string}`,
      });
    }
    const result = await client.deposit({ token: TOKEN, amount });
    await client.pollTransactionStatus(result.txId);
    await refreshBalance();
    return result.txId;
  }, [refreshBalance]);

  /**
   * Private transfer to an unlink1... address.
   * Auto-deposits from EVM wallet if pool balance is insufficient.
   */
  const transfer = useCallback(
    async (recipientAddress: string, amount: bigint): Promise<string> => {
      const client = clientRef.current;
      if (!client) throw new Error('Unlink client not ready');

      // Check pool balance, auto-deposit if needed
      const balances = await client.getBalances({ token: TOKEN });
      const entry = balances.balances?.find(
        (b: any) => b.token.toLowerCase() === TOKEN.toLowerCase(),
      );
      const poolBalance = BigInt(entry?.amount ?? '0');

      if (poolBalance < amount) {
        const depositAmount = amount - poolBalance;
        console.log(`[useUnlink] Auto-depositing ${depositAmount.toString()}`);

        const approval = await client.ensureErc20Approval({
          token: TOKEN,
          amount: depositAmount.toString(),
        });
        if (approval.status === 'submitted') {
          await publicClient.waitForTransactionReceipt({
            hash: approval.txHash as `0x${string}`,
          });
        }

        const dep = await client.deposit({ token: TOKEN, amount: depositAmount.toString() });
        await client.pollTransactionStatus(dep.txId);
      }

      const result = await client.transfer({
        recipientAddress,
        token: TOKEN,
        amount: amount.toString(),
      });
      await client.pollTransactionStatus(result.txId);
      await refreshBalance();
      return result.txId;
    },
    [refreshBalance],
  );

  /**
   * Private send to a 0x... address.
   * Auto-deposits from EVM wallet if needed, then withdraws to the recipient.
   * Sender is PRIVATE, recipient and amount are PUBLIC.
   */
  const privateSendToEvm = useCallback(
    async (recipientEvmAddress: string, amount: bigint): Promise<string> => {
      const client = clientRef.current;
      if (!client) throw new Error('Unlink client not ready');

      // Check pool balance, auto-deposit if needed
      const balances = await client.getBalances({ token: TOKEN });
      const entry = balances.balances?.find(
        (b: any) => b.token.toLowerCase() === TOKEN.toLowerCase(),
      );
      const poolBalance = BigInt(entry?.amount ?? '0');

      if (poolBalance < amount) {
        const depositAmount = amount - poolBalance;
        console.log(`[useUnlink] Auto-depositing ${depositAmount.toString()} for private EVM send`);

        const approval = await client.ensureErc20Approval({
          token: TOKEN,
          amount: depositAmount.toString(),
        });
        if (approval.status === 'submitted') {
          await publicClient.waitForTransactionReceipt({
            hash: approval.txHash as `0x${string}`,
          });
        }

        const dep = await client.deposit({ token: TOKEN, amount: depositAmount.toString() });
        await client.pollTransactionStatus(dep.txId);
      }

      // Withdraw to recipient — sender is private
      const result = await client.withdraw({
        recipientEvmAddress,
        token: TOKEN,
        amount: amount.toString(),
      });
      await client.pollTransactionStatus(result.txId);
      await refreshBalance();
      return result.txId;
    },
    [refreshBalance],
  );

  const withdraw = useCallback(
    async (recipientEvmAddress: string, amount: string): Promise<string> => {
      const client = clientRef.current;
      if (!client) throw new Error('Unlink client not ready');

      const result = await client.withdraw({
        recipientEvmAddress,
        token: TOKEN,
        amount,
      });
      await client.pollTransactionStatus(result.txId);
      await refreshBalance();
      return result.txId;
    },
    [refreshBalance],
  );

  return {
    unlinkAddress,
    unlinkBalance,
    isReady,
    error,
    transfer,
    privateSendToEvm,
    deposit,
    withdraw,
    refreshBalance,
  };
}
