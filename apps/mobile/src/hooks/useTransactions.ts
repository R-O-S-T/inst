import { useSyncExternalStore, useCallback } from 'react';
import type { Transaction } from '../types';
import {
  getTransactions,
  addTransaction as storeAdd,
  subscribe,
} from '../services/transactionStore';

export function useTransactions() {
  const transactions = useSyncExternalStore(subscribe, getTransactions);

  const addTransaction = useCallback((tx: Transaction) => {
    storeAdd(tx);
  }, []);

  return { transactions, addTransaction };
}
