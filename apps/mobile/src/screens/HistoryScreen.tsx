import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Transaction } from '../types';
import { formatAddress } from '../utils/format';

interface HistoryScreenProps {
  transactions: Transaction[];
  isLoading: boolean;
  onRefresh: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function categoryLabel(tx: Transaction): string {
  if (tx.mode === 'private') {
    const labels: Record<string, string> = {
      send: 'Private Transfer',
      receive: 'Withdraw',
    };
    return labels[tx.type] ?? 'Private';
  }

  // Public tx: derive from type + token
  if (tx.type === 'receive') {
    return tx.token === 'ETH' ? 'Receive' : 'Token Receive';
  }
  return tx.token === 'ETH' ? 'Send' : 'Token Send';
}

function txIcon(tx: Transaction): { symbol: string; color: string } {
  if (tx.mode === 'private') {
    return { symbol: '\u21BB', color: '#8B5CF6' }; // ↻ purple
  }
  if (tx.type === 'send') {
    return { symbol: '\u2191', color: '#EF4444' }; // ↑ red
  }
  return { symbol: '\u2193', color: '#22C55E' }; // ↓ green
}

// ── Transaction Row ──────────────────────────────────────────────────

function TransactionItem({ tx }: { tx: Transaction }) {
  const icon = txIcon(tx);
  const label = categoryLabel(tx);
  const isSend = tx.type === 'send';

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.iconContainer}>
          <Text style={[styles.icon, { color: icon.color }]}>{icon.symbol}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.topRow}>
            <Text style={styles.amount}>
              {isSend ? '-' : '+'}
              {tx.amount} {tx.token}
            </Text>
            <Text style={styles.time}>{formatRelativeTime(tx.timestamp)}</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.categoryLabel}>{label}</Text>

            {tx.mode === 'private' && (
              <View style={styles.privateBadge}>
                <Text style={styles.privateBadgeText}>Private</Text>
              </View>
            )}

            {tx.counterparty ? (
              <Text style={styles.counterparty}>
                {isSend ? 'To' : 'From'}: {formatAddress(tx.counterparty)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────

export function HistoryScreen({
  transactions,
  isLoading,
  onRefresh,
}: HistoryScreenProps) {
  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>○</Text>
        <Text style={styles.emptyText}>No transactions yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.heading}>History</Text>}
        renderItem={({ item }) => <TransactionItem tx={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  list: {
    padding: 20,
    paddingTop: 48,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    color: '#999999',
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabel: {
    color: '#999999',
    fontSize: 12,
    marginRight: 8,
  },
  privateBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  privateBadgeText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
  },
  counterparty: {
    color: '#999999',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    color: '#999999',
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#999999',
    fontSize: 16,
  },
});
