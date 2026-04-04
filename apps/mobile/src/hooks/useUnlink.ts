import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, sha256, toBytes } from 'viem';
import { baseSepolia } from 'viem/chains';

import { dynamicClient } from '../../client';
import { useWallet } from './useWallet';
import { createUnlinkFromSeed, ULNKM, TOKEN_BY_SYMBOL } from '../services/unlinkClient';

const BALANCE_POLL_MS = 30_000;

function tokenAddr(symbol?: string): string {
  if (!symbol) return ULNKM.address;
  return TOKEN_BY_SYMBOL[symbol]?.address || ULNKM.address;
}

/**
 * Retry wrapper — viem's first call to eth_fillTransaction fails on public RPCs,
 * but it caches the failure and uses standard methods on the second attempt.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || '';
      if (i < retries - 1 && (msg.includes('eth_fillTransaction') || msg.includes('ethRequest rejected'))) {
        console.log('[useUnlink] Retrying after eth_fillTransaction error...');
        continue;
      }
      throw err;
    }
  }
  throw new Error('withRetry exhausted');
}

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
      const balances = await client.getBalances({ token: ULNKM.address });
      const entry = balances.balances?.find(
        (b: any) => b.token.toLowerCase() === ULNKM.address.toLowerCase(),
      );
      const raw = BigInt(entry?.amount ?? '0');
      const whole = raw / 10n ** 18n;
      const frac = raw % 10n ** 18n;
      const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
      const formatted = fracStr ? `${whole}.${fracStr}` : whole.toString();
      console.log('[useUnlink] balance:', formatted);
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

        console.log('[useUnlink] initialized, address:', addr);
        setUnlinkAddress(addr);
        setIsReady(true);

        await refreshBalance();
        console.log('[useUnlink] init complete');
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

    const approval = await withRetry(() => client.ensureErc20Approval({ token: ULNKM.address, amount }));
    if (approval.status === 'submitted') {
      await publicClient.waitForTransactionReceipt({
        hash: approval.txHash as `0x${string}`,
      });
    }
    const result = await client.deposit({ token: ULNKM.address, amount });
    await client.pollTransactionStatus(result.txId);
    await refreshBalance();
    return result.txId;
  }, [refreshBalance]);

  /**
   * Private transfer to an unlink1... address.
   * Auto-deposits from EVM wallet if pool balance is insufficient.
   */
  const transfer = useCallback(
    async (recipientAddress: string, amount: bigint, tokenSymbol?: string): Promise<string> => {
      const client = clientRef.current;
      if (!client) throw new Error('Unlink client not ready');
      const tk = tokenAddr(tokenSymbol);

      const balances = await client.getBalances({ token: tk });
      const entry = balances.balances?.find(
        (b: any) => b.token.toLowerCase() === tk.toLowerCase(),
      );
      const poolBalance = BigInt(entry?.amount ?? '0');

      if (poolBalance < amount) {
        const depositAmount = amount - poolBalance;
        console.log(`[useUnlink] Auto-depositing ${depositAmount.toString()} of ${tk}`);

        const approval = await withRetry(() => client.ensureErc20Approval({ token: tk, amount: depositAmount.toString() }));
        if (approval.status === 'submitted') {
          await publicClient.waitForTransactionReceipt({ hash: approval.txHash as `0x${string}` });
        }

        const dep = await client.deposit({ token: tk, amount: depositAmount.toString() });
        await client.pollTransactionStatus(dep.txId);
      }

      const result = await client.transfer({ recipientAddress, token: tk, amount: amount.toString() });
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
    async (recipientEvmAddress: string, amount: bigint, tokenSymbol?: string): Promise<string> => {
      const client = clientRef.current;
      if (!client) throw new Error('Unlink client not ready');
      const tk = tokenAddr(tokenSymbol);

      const balances = await client.getBalances({ token: tk });
      const entry = balances.balances?.find(
        (b: any) => b.token.toLowerCase() === tk.toLowerCase(),
      );
      const poolBalance = BigInt(entry?.amount ?? '0');

      if (poolBalance < amount) {
        const depositAmount = amount - poolBalance;
        console.log(`[useUnlink] Auto-depositing ${depositAmount.toString()} of ${tk} for private EVM send`);

        const approval = await withRetry(() => client.ensureErc20Approval({ token: tk, amount: depositAmount.toString() }));
        if (approval.status === 'submitted') {
          await publicClient.waitForTransactionReceipt({ hash: approval.txHash as `0x${string}` });
        }

        const dep = await client.deposit({ token: tk, amount: depositAmount.toString() });
        await client.pollTransactionStatus(dep.txId);
      }

      const result = await client.withdraw({ recipientEvmAddress, token: tk, amount: amount.toString() });
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
        token: ULNKM.address,
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
