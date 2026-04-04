import 'react-native-get-random-values';
import '@walletconnect/react-native-compat';

import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { dynamicClient } from './client';

export default function App() {
  return (
    <>
      <dynamicClient.reactNative.WebView />
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Instant — loading...</Text>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});
