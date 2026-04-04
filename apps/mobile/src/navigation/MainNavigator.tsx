import React, { useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import { useWallet } from '../hooks/useWallet';
import { useBalance } from '../hooks/useBalance';
import { useSendTransaction } from '../hooks/useSendTransaction';
import { useTransactions } from '../hooks/useTransactions';
import { sendPrivate } from '../services/api';

import { AuthScreen } from '../screens/AuthScreen';
import { BalanceScreen } from '../screens/BalanceScreen';
import { SendScreen } from '../screens/SendScreen';
import { ReceiveScreen } from '../screens/ReceiveScreen';
import { HistoryScreen } from '../screens/HistoryScreen';

// ---------- Connected screen wrappers ----------

function ConnectedBalanceScreen() {
  const { address } = useWallet();
  const { evmBalance, unlinkAddress, unlinkBalance, isLoading, refetch } =
    useBalance(address);
  const navigation = useNavigation<any>();

  const onNavigateSend = useCallback(() => {
    navigation.navigate('Send');
  }, [navigation]);

  const onNavigateReceive = useCallback(() => {
    navigation.navigate('Receive');
  }, [navigation]);

  return (
    <BalanceScreen
      evmAddress={address ?? undefined}
      evmBalance={evmBalance}
      unlinkAddress={unlinkAddress}
      unlinkBalance={unlinkBalance}
      isLoading={isLoading}
      onRefresh={refetch}
      onNavigateSend={onNavigateSend}
      onNavigateReceive={onNavigateReceive}
    />
  );
}

function ConnectedSendScreen() {
  const { address } = useWallet();
  const { evmBalance, unlinkBalance, unlinkAddress } = useBalance(address);
  const { sendPublic } = useSendTransaction();
  const { addTransaction } = useTransactions();

  const recordTx = useCallback(
    (to: string, amount: string, mode: 'public' | 'private', txHash: string) => {
      addTransaction({
        id: txHash || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'send',
        mode,
        amount,
        token: 'ETH',
        counterparty: to,
        txHash: txHash || undefined,
        timestamp: Date.now(),
        status: 'confirmed',
      });
    },
    [addTransaction],
  );

  const wrappedSendPublic = useCallback(
    async (to: string, amount: string): Promise<string> => {
      if (!sendPublic) throw new Error('Send not available');
      const hash = await sendPublic(to, amount);
      recordTx(to, amount, 'public', hash);
      return hash;
    },
    [sendPublic, recordTx],
  );

  const wrappedSendPrivate = useCallback(
    async (to: string, amount: string): Promise<string> => {
      if (!address) throw new Error('No wallet connected');
      const res = await sendPrivate({
        senderWalletAddress: address,
        recipientUnlinkAddress: to,
        amount,
        token: 'ETH',
      });
      if (!res.success) {
        throw new Error(res.error ?? 'Private send failed');
      }
      const hash = res.txHash ?? '';
      recordTx(to, amount, 'private', hash);
      return hash;
    },
    [address, recordTx],
  );

  return (
    <SendScreen
      evmBalance={evmBalance}
      unlinkBalance={unlinkBalance}
      senderAddress={address ?? undefined}
      onSendPublic={wrappedSendPublic}
      onSendPrivate={wrappedSendPrivate}
    />
  );
}

function ConnectedReceiveScreen() {
  const { address } = useWallet();
  const { unlinkAddress } = useBalance(address);

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
