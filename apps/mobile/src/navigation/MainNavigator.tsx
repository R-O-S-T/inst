import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ---------- Placeholder screens ----------

function BalanceScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Balance</Text>
    </View>
  );
}

function SendScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Send</Text>
    </View>
  );
}

function ReceiveScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Receive</Text>
    </View>
  );
}

function HistoryScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>History</Text>
    </View>
  );
}

// ---------- Navigator ----------

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
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
      <Tab.Screen name="Balance" component={BalanceScreen} />
      <Tab.Screen name="Send" component={SendScreen} />
      <Tab.Screen name="Receive" component={ReceiveScreen} />
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
