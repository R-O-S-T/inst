import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BalanceCard } from '../components/BalanceCard';
import { formatAddress } from '../utils/format';

interface BalanceScreenProps {
  evmAddress?: string;
  evmBalance?: string;
  unlinkAddress?: string;
  unlinkBalance?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onNavigateSend?: () => void;
  onNavigateReceive?: () => void;
}

export function BalanceScreen({
  evmAddress,
  evmBalance = '0',
  unlinkAddress,
  unlinkBalance = '0',
  isLoading = false,
  onRefresh,
  onNavigateSend,
  onNavigateReceive,
}: BalanceScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        <Text style={styles.heading}>Wallet</Text>

        <View style={styles.section}>
          {evmAddress ? (
            <Text style={styles.addressLabel}>{formatAddress(evmAddress)}</Text>
          ) : null}
          <BalanceCard
            label="Public Balance"
            balance={evmBalance}
            token="ETH"
            isLoading={isLoading}
          />
        </View>

        <View style={styles.section}>
          {unlinkAddress ? (
            <Text style={styles.addressLabel}>{formatAddress(unlinkAddress)}</Text>
          ) : null}
          <BalanceCard
            label="Private Balance"
            balance={unlinkBalance}
            token="ETH"
            isLoading={isLoading}
          />
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onNavigateSend}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>Send</Text>
        </TouchableOpacity>

        <View style={styles.actionSpacer} />

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonOutline]}
          onPress={onNavigateReceive}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonText, styles.actionButtonOutlineText]}>
            Receive
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    marginBottom: 8,
  },
  addressLabel: {
    color: '#999999',
    fontSize: 13,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    backgroundColor: '#0D0D0D',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionSpacer: {
    width: 12,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  actionButtonOutlineText: {
    color: '#6366F1',
  },
});
