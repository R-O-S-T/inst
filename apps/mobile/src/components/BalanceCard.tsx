import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { formatBalance } from '../utils/format';

interface BalanceCardProps {
  label: string;
  balance: string;
  token: string;
  isLoading: boolean;
}

export function BalanceCard({ label, balance, token, isLoading }: BalanceCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isLoading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }

    pulseAnim.setValue(1);
  }, [isLoading, pulseAnim]);

  const displayBalance = isLoading ? '---' : formatBalance(balance);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={{ opacity: isLoading ? pulseAnim : 1 }}>
        <View style={styles.balanceRow}>
          <Text style={styles.balance}>{displayBalance}</Text>
          <Text style={styles.token}>{token}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    marginBottom: 12,
  },
  label: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginRight: 8,
  },
  token: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '500',
  },
});
