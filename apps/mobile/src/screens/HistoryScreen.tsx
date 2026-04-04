import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Transaction } from '../types';
import { formatAddress } from '../utils/format';

interface HistoryScreenProps {
  walletAddress?: string;
  transactions?: Transaction[];
}

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

function StatusDot({ status }: { status: Transaction['status'] }) {
  const color =
    status === 'confirmed'
      ? '#22C55E'
      : status === 'pending'
        ? '#F59E0B'
        : '#EF4444';
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function TransactionItem({ tx }: { tx: Transaction }) {
  const isSend = tx.type === 'send';

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.iconContainer}>
          <Text style={[styles.icon, { color: isSend ? '#EF4444' : '#22C55E' }]}>
            {isSend ? '↑' : '↓'}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.topRow}>
            <Text style={styles.amount}>
              {isSend ? '-' : '+'}{tx.amount} {tx.token}
            </Text>
            <View style={styles.rightGroup}>
              <StatusDot status={tx.status} />
              <Text style={styles.time}>{formatRelativeTime(tx.timestamp)}</Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View
              style={[
                styles.modeBadge,
                tx.mode === 'private' ? styles.modeBadgePrivate : styles.modeBadgePublic,
              ]}
            >
              <Text style={styles.modeBadgeText}>
                {tx.mode === 'private' ? 'Private' : 'Public'}
              </Text>
            </View>
            <Text style={styles.counterparty}>
              {isSend ? 'To' : 'From'}: {formatAddress(tx.counterparty)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function HistoryScreen({
  transactions = [],
}: HistoryScreenProps) {
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
      />
    </View>
  );
}

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
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  time: {
    color: '#999999',
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  modeBadgePublic: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  modeBadgePrivate: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  modeBadgeText: {
    color: '#6366F1',
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
