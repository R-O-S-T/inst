import 'react-native-get-random-values';
import '@walletconnect/react-native-compat';

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { dynamicClient } from './client';
import MainNavigator from './src/navigation/MainNavigator';
import { ClaimProvider } from './src/providers/ClaimProvider';

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366F1',
    background: '#0D0D0D',
    card: '#1A1A1A',
    text: '#FFFFFF',
    border: '#2A2A2A',
    notification: '#6366F1',
  },
};

const linking = {
  prefixes: [Linking.createURL('/'), 'instant://'],
  config: {
    screens: {
      Claim: 'claim/:claimCode',
    },
  },
};

export default function App() {
  return (
    <>
      <dynamicClient.reactNative.WebView />
      <ClaimProvider>
        <NavigationContainer theme={DarkTheme} linking={linking}>
          <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
          <MainNavigator />
        </NavigationContainer>
      </ClaimProvider>
    </>
  );
}
