import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { parseUnits } from 'viem';

import { useWallet } from '../hooks/useWallet';
import { useImageAuth } from '../hooks/useImageAuth';
import { useBalance } from '../hooks/useBalance';
import { useSendTransaction } from '../hooks/useSendTransaction';
import { useTransactions } from '../hooks/useTransactions';
import { useUnlink } from '../hooks/useUnlink';
import { useSafeContext } from '../providers/SafeProvider';
import { UnlinkSeedProvider } from '../providers/UnlinkSeedProvider';
import { TOKEN_BY_SYMBOL } from '../services/unlinkClient';

import { AuthScreen } from '../screens/AuthScreen';
import { BalanceScreen } from '../screens/BalanceScreen';
import { SendScreen } from '../screens/SendScreen';
import { ReceiveScreen } from '../screens/ReceiveScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { KeyRotationScreen } from '../screens/KeyRotationScreen';

// ---------- Connected screen wrappers ----------

function ConnectedBalanceScreen() {
  const { address, logout } = useWallet();
  const { safeAddress, isDeploying } = useSafeContext();
  const displayAddress = safeAddress ?? address;
  const { balances, isLoading, refetch } = useBalance(displayAddress);
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

  const totalUlnkm = useMemo(() => {
    const onChain = parseFloat(balances['ULNKm'] || '0');
    const pool = parseFloat(unlinkBalance) || 0;
    return (onChain + pool).toString();
  }, [balances, unlinkBalance]);

  return (
    <BalanceScreen
      evmAddress={displayAddress ?? undefined}
      evmBalance={balances['ETH'] || '0'}
      unlinkAddress={unlinkAddress}
      unlinkBalance={totalUlnkm}
      isLoading={isLoading || isDeploying}
      onRefresh={onRefresh}
      onNavigateSend={onNavigateSend}
      onNavigateReceive={onNavigateReceive}
      onLogout={logout}
    />
  );
}

function ConnectedSendScreen() {
  const { address } = useWallet();
  const { safeAddress, smartAccountClient } = useSafeContext();
  const displayAddress = safeAddress ?? address;
  const { balances } = useBalance(displayAddress);
  const { unlinkBalance, transfer, privateSendToEvm } = useUnlink();
  const { sendPublic } = useSendTransaction(smartAccountClient);

  const totalUlnkm = useMemo(() => {
    const onChain = parseFloat(balances['ULNKm'] || '0');
    const pool = parseFloat(unlinkBalance) || 0;
    return (onChain + pool).toString();
  }, [balances, unlinkBalance]);

  const wrappedSendPublic = useCallback(
    async (to: string, amount: string, token: string): Promise<string> => {
      return sendPublic(to, amount, token);
    },
    [sendPublic],
  );

  const wrappedSendPrivate = useCallback(
    async (to: string, amount: string, tokenSymbol: string): Promise<string> => {
      const decimals = TOKEN_BY_SYMBOL[tokenSymbol]?.decimals ?? 18;
      const amountBigInt = parseUnits(amount, decimals);
      return transfer(to, amountBigInt, tokenSymbol);
    },
    [transfer],
  );

  const wrappedSendPrivateToEvm = useCallback(
    async (to: string, amount: string, tokenSymbol: string): Promise<string> => {
      const decimals = TOKEN_BY_SYMBOL[tokenSymbol]?.decimals ?? 18;
      const amountBigInt = parseUnits(amount, decimals);
      return privateSendToEvm(to, amountBigInt, tokenSymbol);
    },
    [privateSendToEvm],
  );

  return (
    <SendScreen
      balances={{ ...balances, ULNKm: totalUlnkm }}
      unlinkBalance={totalUlnkm}
      senderAddress={displayAddress ?? undefined}
      onSendPublic={wrappedSendPublic}
      onSendPrivate={wrappedSendPrivate}
      onSendPrivateToEvm={wrappedSendPrivateToEvm}
    />
  );
}

function ConnectedReceiveScreen() {
  const { address } = useWallet();
  const { safeAddress } = useSafeContext();
  const { unlinkAddress } = useUnlink();

  return (
    <ReceiveScreen
      evmAddress={(safeAddress ?? address) ?? undefined}
      unlinkAddress={unlinkAddress || undefined}
    />
  );
}

function ConnectedHistoryScreen() {
  const { address } = useWallet();
  const { safeAddress } = useSafeContext();
  const { getTransactions: getUnlinkTransactions } = useUnlink();

  const { transactions, isLoading, refetch } = useTransactions({
    walletAddress: (safeAddress ?? address) ?? undefined,
    getUnlinkTransactions,
  });

  return (
    <HistoryScreen
      transactions={transactions}
      isLoading={isLoading}
      onRefresh={refetch}
    />
  );
}

// ---------- Connected Settings & Key Rotation wrappers ----------

function ConnectedSettingsScreen() {
  const { safeAddress, owners, threshold, isDeployed } = useSafeContext();
  const { logout } = useWallet();
  const navigation = useNavigation<any>();

  return (
    <SettingsScreen
      safeAddress={safeAddress ?? undefined}
      owners={owners}
      threshold={Number(threshold)}
      isDeployed={isDeployed}
      onRotateKey={() => navigation.navigate('KeyRotation')}
      onLogout={logout}
    />
  );
}

function ConnectedKeyRotationScreen() {
  const { safeAddress, smartAccountClient, owners } = useSafeContext();
  const { logout } = useWallet();
  const navigation = useNavigation<any>();

  return (
    <KeyRotationScreen
      safeAddress={safeAddress!}
      currentOwner={owners[0] || ''}
      smartAccountClient={smartAccountClient!}
      onComplete={() => {
        logout();
        // Navigation will reset automatically because isAuthenticated becomes false
      }}
      onCancel={() => navigation.goBack()}
    />
  );
}

// ---------- Tab icon helper ----------

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 20 }}>{label}</Text>;
}

// ---------- Navigator ----------

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import { SafeProvider } from '../providers/SafeProvider';

function DynamicTabs() {
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
      <Tab.Screen
        name="Settings"
        component={ConnectedSettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="⚙" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function MainNavigatorInner() {
  const { isAuthenticated, isLoading: authLoading } = useWallet();
  const { safeAddress } = useSafeContext();

  if (!isAuthenticated && !authLoading) {
    return <AuthScreen />;
  }

  if (isAuthenticated && !safeAddress) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Setting up your wallet...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={DynamicTabs} />
      <Stack.Screen name="KeyRotation" component={ConnectedKeyRotationScreen} />
    </Stack.Navigator>
  );
}

function ImageNavigatorInner({
  onLogoutImage,
}: {
  onLogoutImage: () => void;
}) {
  const { safeAddress } = useSafeContext();

  if (!safeAddress) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your wallet...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs">
        {() => (
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
              options={{
                tabBarIcon: ({ color }) => <TabIcon label="◉" color={color} />,
              }}
            >
              {() => <ImageConnectedBalanceScreen onLogout={onLogoutImage} />}
            </Tab.Screen>
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
            <Tab.Screen
              name="Settings"
              component={ConnectedSettingsScreen}
              options={{
                tabBarIcon: ({ color }) => <TabIcon label="⚙" color={color} />,
              }}
            />
          </Tab.Navigator>
        )}
      </Stack.Screen>
      <Stack.Screen name="KeyRotation" component={ConnectedKeyRotationScreen} />
    </Stack.Navigator>
  );
}

/**
 * Balance screen variant for image-auth that uses the image logout handler.
 */
function ImageConnectedBalanceScreen({ onLogout }: { onLogout: () => void }) {
  const { safeAddress, isDeploying } = useSafeContext();
  const { balances, isLoading, refetch } = useBalance(safeAddress);
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

  const totalUlnkm = useMemo(() => {
    const onChain = parseFloat(balances['ULNKm'] || '0');
    const pool = parseFloat(unlinkBalance) || 0;
    return (onChain + pool).toString();
  }, [balances, unlinkBalance]);

  return (
    <BalanceScreen
      evmAddress={safeAddress ?? undefined}
      evmBalance={balances['ETH'] || '0'}
      unlinkAddress={unlinkAddress}
      unlinkBalance={totalUlnkm}
      isLoading={isLoading || isDeploying}
      onRefresh={onRefresh}
      onNavigateSend={onNavigateSend}
      onNavigateReceive={onNavigateReceive}
      onLogout={onLogout}
    />
  );
}

export default function MainNavigator() {
  const {
    isImageAuthenticated,
    imageAddress,
    imageSigner,
    unlinkSeed,
    loginWithImage,
    logoutImage,
  } = useImageAuth();
  const { isAuthenticated, isLoading: authLoading } = useWallet();

  // Image-auth path
  if (isImageAuthenticated && imageSigner) {
    return (
      <SafeProvider externalSigner={imageSigner}>
        <UnlinkSeedProvider externalSeed={unlinkSeed}>
          <ImageNavigatorInner onLogoutImage={logoutImage} />
        </UnlinkSeedProvider>
      </SafeProvider>
    );
  }

  // Dynamic-auth path
  if (isAuthenticated || authLoading) {
    return (
      <SafeProvider>
        <UnlinkSeedProvider>
          <MainNavigatorInner />
        </UnlinkSeedProvider>
      </SafeProvider>
    );
  }

  // Not authenticated -- show auth screen with both options
  return <AuthScreen onImageLogin={loginWithImage} />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#999999',
    fontSize: 16,
    marginTop: 16,
  },
});
