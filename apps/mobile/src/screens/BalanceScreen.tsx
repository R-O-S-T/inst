import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Clipboard,
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
  onLogout?: () => void;
}

/** Pulsing skeleton placeholder shown while first balance load is in progress */
function SkeletonBlock({ width, height }: { width: number | string; height: number }) {
  const anim = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={{
        width: width as any,
        height,
        borderRadius: 8,
        backgroundColor: '#2A2A2A',
        opacity: anim,
        marginBottom: 12,
      }}
    />
  );
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
  onLogout,
}: BalanceScreenProps) {
  // Consider it a "first load" when loading with no real balance data yet
  const isFirstLoad = isLoading && evmBalance === '0' && unlinkBalance === '0';

  const handleCopyAddress = () => {
    if (evmAddress) {
      Clipboard.setString(evmAddress);
    }
  };

  if (!evmAddress) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.connectText}>Connect wallet to view balances</Text>
        </View>
      </View>
    );
  }

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
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Wallet</Text>
          {onLogout && (
            <TouchableOpacity onPress={onLogout} activeOpacity={0.7} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Wallet address header with copy */}
        <TouchableOpacity
          onPress={handleCopyAddress}
          activeOpacity={0.7}
          style={styles.addressRow}
        >
          <Text style={styles.addressText}>{formatAddress(evmAddress)}</Text>
          <Text style={styles.copyHint}>Tap to copy</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          {isFirstLoad ? (
            <View style={styles.skeletonCard}>
              <SkeletonBlock width={120} height={14} />
              <SkeletonBlock width={180} height={32} />
            </View>
          ) : (
            <BalanceCard
              label="Public Balance"
              balance={evmBalance}
              token="ETH"
              isLoading={isLoading}
            />
          )}
        </View>

        <View style={styles.section}>
          {unlinkAddress ? (
            <Text style={styles.addressLabel}>{formatAddress(unlinkAddress)}</Text>
          ) : null}
          {isFirstLoad ? (
            <View style={styles.skeletonCard}>
              <SkeletonBlock width={120} height={14} />
              <SkeletonBlock width={180} height={32} />
            </View>
          ) : (
            <BalanceCard
              label="Private Balance"
              balance={unlinkBalance}
              token="ULNKm"
              isLoading={isLoading}
              formatted
            />
          )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectText: {
    color: '#999999',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  logoutText: {
    color: '#999999',
    fontSize: 13,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addressText: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  copyHint: {
    color: '#6366F1',
    fontSize: 12,
    marginLeft: 8,
  },
  section: {
    marginBottom: 8,
  },
  addressLabel: {
    color: '#999999',
    fontSize: 13,
    marginBottom: 6,
  },
  skeletonCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    marginBottom: 12,
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
