import type { Transaction } from '../types';

// Module-level in-memory store
let transactions: Transaction[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getTransactions(): Transaction[] {
  return transactions;
}

export function addTransaction(tx: Transaction): void {
  // Prepend so newest is first
  transactions = [tx, ...transactions];
  notify();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
