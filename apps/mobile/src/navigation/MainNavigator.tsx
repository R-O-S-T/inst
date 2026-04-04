import React, { useCallback, useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import { useWallet } from '../hooks/useWallet';
import { useBalance } from '../hooks/useBalance';
import { useSendTransaction } from '../hooks/useSendTransaction';
import { useTransactions } from '../hooks/useTransactions';
import { useUnlink } from '../hooks/useUnlink';
import { TOKEN_BY_SYMBOL } from '../services/unlinkClient';
import { parseUnits } from 'viem';

import { AuthScreen } from '../screens/AuthScreen';
import { BalanceScreen } from '../screens/BalanceScreen';
import { SendScreen } from '../screens/SendScreen';
import { ReceiveScreen } from '../screens/ReceiveScreen';
import { HistoryScreen } from '../screens/HistoryScreen';

// ---------- Connected screen wrappers ----------

function ConnectedBalanceScreen() {
  const { address, logout } = useWallet();
  const { balances, isLoading, refetch } = useBalance(address);
  const { unlinkAddress, unlinkBalance, refreshBalance } = useUnlink();
  const navigation = useNavigation<any>();

  const onNavigateSend = useCallback(() => {
    navigation.navigate('Send');
  }, [navigation]);

  const onNavigateReceive = useCallback(() => {
    navigation.navigate('Receive');
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refetch(), refreshBalance()]);
  }, [refetch, refreshBalance]);

  // Combined ULNKm balance = on-chain + pool
  const totalUlnkm = useMemo(() => {
    const onChain = parseFloat(balances['ULNKm'] || '0');
    const pool = parseFloat(unlinkBalance) || 0;
    return (onChain + pool).toString();
  }, [balances, unlinkBalance]);

  return (
    <BalanceScreen
      evmAddress={address ?? undefined}
      evmBalance={balances['ETH'] || '0'}
      unlinkAddress={unlinkAddress}
      unlinkBalance={totalUlnkm}
      isLoading={isLoading}
      onRefresh={onRefresh}
      onNavigateSend={onNavigateSend}
      onNavigateReceive={onNavigateReceive}
      onLogout={logout}
    />
  );
}

function ConnectedSendScreen() {
  const { address } = useWallet();
  const { balances, refetch: refetchBalance } = useBalance(address);
  const { unlinkBalance, transfer, privateSendToEvm, withdraw, refreshBalance } = useUnlink();
  const { sendPublic } = useSendTransaction();
  const { addTransaction } = useTransactions();

  const totalUlnkm = useMemo(() => {
    const onChain = parseFloat(balances['ULNKm'] || '0');
    const pool = parseFloat(unlinkBalance) || 0;
    return (onChain + pool).toString();
  }, [balances, unlinkBalance]);

  const recordTx = useCallback(
    (to: string, amount: string, mode: 'public' | 'private', txHash: string) => {
      addTransaction({
        id: txHash || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'send',
        mode,
        amount,
        token: 'ULNKm',
        counterparty: to,
        txHash: txHash || undefined,
        timestamp: Date.now(),
        status: 'confirmed',
      });
    },
    [addTransaction],
  );

  const wrappedSendPublic = useCallback(
    async (to: string, amount: string, token: 'ETH' | 'ULNKm' = 'ETH'): Promise<string> => {
      if (!sendPublic) throw new Error('Send not available');
      const hash = await sendPublic(to, amount, token);
      recordTx(to, amount, 'public', hash);
      return hash;
    },
    [sendPublic, recordTx],
  );

  const wrappedSendPrivate = useCallback(
    async (to: string, amount: string, tokenSymbol: string): Promise<string> => {
      const decimals = TOKEN_BY_SYMBOL[tokenSymbol]?.decimals ?? 18;
      const amountBigInt = parseUnits(amount, decimals);
      const txId = await transfer(to, amountBigInt, tokenSymbol);
      recordTx(to, amount, 'private', txId);
      return txId;
    },
    [transfer, recordTx],
  );

  const wrappedSendPrivateToEvm = useCallback(
    async (to: string, amount: string, tokenSymbol: string): Promise<string> => {
      const decimals = TOKEN_BY_SYMBOL[tokenSymbol]?.decimals ?? 18;
      const amountBigInt = parseUnits(amount, decimals);
      const txId = await privateSendToEvm(to, amountBigInt, tokenSymbol);
      recordTx(to, amount, 'private', txId);
      return txId;
    },
    [privateSendToEvm, recordTx],
  );

  return (
    <SendScreen
      balances={{ ...balances, ULNKm: totalUlnkm }}
      unlinkBalance={totalUlnkm}
      senderAddress={address ?? undefined}
      onSendPublic={wrappedSendPublic}
      onSendPrivate={wrappedSendPrivate}
      onSendPrivateToEvm={wrappedSendPrivateToEvm}
    />
  );
}

function ConnectedReceiveScreen() {
  const { address } = useWallet();
  const { unlinkAddress } = useUnlink();

  return (
    <ReceiveScreen
      evmAddress={address ?? undefined}
      unlinkAddress={unlinkAddress || undefined}
    />
  );
}

function ConnectedHistoryScreen() {
  const { address } = useWallet();
  const { transactions } = useTransactions();

  return (
    <HistoryScreen
      walletAddress={address ?? undefined}
      transactions={transactions}
    />
  );
}

// ---------- Tab icon helper ----------

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 20 }}>{label}</Text>;
}

// ---------- Navigator ----------

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  const { isAuthenticated, isLoading } = useWallet();

  if (!isAuthenticated && !isLoading) {
    return <AuthScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#2A2A2A',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#999999',
      }}
    >
      <Tab.Screen
        name="Balance"
        component={ConnectedBalanceScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="◉" color={color} />,
        }}
      />
      <Tab.Screen
        name="Send"
        component={ConnectedSendScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="↑" color={color} />,
        }}
      />
      <Tab.Screen
        name="Receive"
        component={ConnectedReceiveScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="↓" color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={ConnectedHistoryScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="☰" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});
