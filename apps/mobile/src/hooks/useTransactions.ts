import { useState, useEffect, useCallback, useRef } from 'react';
import { getWalletHistory, clearHistoryCache } from '../services/moralis';
import type { MoralisHistoryItem } from '../services/moralis';
import type { UnlinkTransaction } from './useUnlink';
import type { Transaction } from '../types';

const REFRESH_INTERVAL_MS = 60_000;

// ── Normalizers ──────────────────────────────────────────────────────

function categorizeMoralis(
  item: MoralisHistoryItem,
  walletAddress: string,
): { type: 'send' | 'receive'; label: string } {
  const cat = item.category?.toLowerCase() ?? '';
  const from = item.from_address?.toLowerCase() ?? '';
  const wallet = walletAddress.toLowerCase();

  if (cat.includes('receive') || from !== wallet) {
    const label =
      cat.includes('token') ? 'Token Receive' : 'Receive';
    return { type: 'receive', label };
  }

  const label = cat.includes('token') ? 'Token Send' : 'Send';
  return { type: 'send', label };
}

function normalizeMoralis(
  item: MoralisHistoryItem,
  walletAddress: string,
): Transaction {
  const { type } = categorizeMoralis(item, walletAddress);

  // Prefer erc20 transfer info, fall back to native
  let amount = '0';
  let token = 'ETH';
  if (item.erc20_transfers?.length > 0) {
    const t = item.erc20_transfers[0];
    amount = t.value_formatted ?? '0';
    token = t.token_symbol ?? 'ERC20';
  } else if (item.native_transfers?.length > 0) {
    const t = item.native_transfers[0];
    amount = t.value_formatted ?? '0';
    token = t.token_symbol ?? 'ETH';
  }

  const counterparty =
    type === 'send' ? (item.to_address ?? '') : (item.from_address ?? '');

  return {
    id: item.hash,
    type,
    mode: 'public',
    amount,
    token,
    counterparty,
    txHash: item.hash,
    timestamp: new Date(item.block_timestamp).getTime(),
    status: 'confirmed',
  };
}

function normalizeUnlink(item: UnlinkTransaction): Transaction {
  const typeMap: Record<string, 'send' | 'receive'> = {
    deposit: 'send',
    withdraw: 'receive',
    transfer: 'send',
  };

  return {
    id: item.tx_id,
    type: typeMap[item.type] ?? 'send',
    mode: 'private',
    amount: item.amount ?? '0',
    token: item.token ?? 'ULNKm',
    counterparty: '',
    txHash: item.tx_id,
    timestamp: new Date(item.created_at).getTime(),
    status: item.status === 'failed' ? 'failed' : 'confirmed',
  };
}

// ── Hook ─────────────────────────────────────────────────────────────

interface UseTransactionsOptions {
  walletAddress?: string;
  getUnlinkTransactions?: () => Promise<UnlinkTransaction[]>;
}

export function useTransactions({
  walletAddress,
  getUnlinkTransactions,
}: UseTransactionsOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);

      try {
        const [moralisItems, unlinkItems] = await Promise.all([
          walletAddress
            ? getWalletHistory(walletAddress, 'base sepolia', isRefresh)
            : Promise.resolve([] as MoralisHistoryItem[]),
          getUnlinkTransactions
            ? getUnlinkTransactions()
            : Promise.resolve([] as UnlinkTransaction[]),
        ]);

        const moralisTxs = moralisItems.map((item) =>
          normalizeMoralis(item, walletAddress ?? ''),
        );
        const unlinkTxs = unlinkItems.map(normalizeUnlink);

        const merged = [...moralisTxs, ...unlinkTxs].sort(
          (a, b) => b.timestamp - a.timestamp,
        );

        setTransactions(merged);
      } catch (err) {
        console.warn('[useTransactions] fetch error', err);
      } finally {
        setIsLoading(false);
      }
    },
    [walletAddress, getUnlinkTransactions],
  );

  // Fetch on mount only — no auto-polling. Use pull-to-refresh.
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refetch = useCallback(() => {
    clearHistoryCache();
    return fetchAll(true);
  }, [fetchAll]);

  return { transactions, isLoading, refetch };
}
