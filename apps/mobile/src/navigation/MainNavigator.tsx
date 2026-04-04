import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import { useWallet } from '../hooks/useWallet';
import { useBalance } from '../hooks/useBalance';
import { useSendTransaction } from '../hooks/useSendTransaction';
import { sendPrivate } from '../services/api';

import { AuthScreen } from '../screens/AuthScreen';
import { BalanceScreen } from '../screens/BalanceScreen';
import { SendScreen } from '../screens/SendScreen';
import { ReceiveScreen } from '../screens/ReceiveScreen';

// ---------- History placeholder ----------

function HistoryScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Coming soon</Text>
    </View>
  );
}

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

  const onSendPrivate = useCallback(
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
      return res.txHash ?? '';
    },
    [address],
  );

  return (
    <SendScreen
      evmBalance={evmBalance}
      unlinkBalance={unlinkBalance}
      senderAddress={address ?? undefined}
      onSendPublic={sendPublic}
      onSendPrivate={onSendPrivate}
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
      <Tab.Screen name="Balance" component={ConnectedBalanceScreen} />
      <Tab.Screen name="Send" component={ConnectedSendScreen} />
      <Tab.Screen name="Receive" component={ConnectedReceiveScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
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
