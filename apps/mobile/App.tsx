import 'react-native-get-random-values';
import '@walletconnect/react-native-compat';

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { dynamicClient } from './client';
import MainNavigator from './src/navigation/MainNavigator';

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

export default function App() {
  return (
    <>
      <dynamicClient.reactNative.WebView />
      <NavigationContainer theme={DarkTheme}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
        <MainNavigator />
      </NavigationContainer>
    </>
  );
}
