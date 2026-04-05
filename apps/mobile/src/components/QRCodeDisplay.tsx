import React, { useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import QRCode from 'react-native-qrcode-svg';


interface QRCodeDisplayProps {
  address: string;
  label: string;
  size?: number;
}

export function QRCodeDisplay({ address, label, size = 200 }: QRCodeDisplayProps) {
  const handleCopy = useCallback(() => {
    Alert.alert('Address', address);
  }, [address]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.qrPlaceholder, { width: size + 32, height: size + 32 }]}>
        <QRCode
          value={address || ' '}
          size={size}
          backgroundColor="#FFFFFF"
          color="#0D0D0D"
        />
      </View>

      <Text style={styles.address} selectable>
        {address}
      </Text>

      <TouchableOpacity style={styles.copyButton} onPress={handleCopy} activeOpacity={0.7}>
        <Text style={styles.copyButtonText}>Copy</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  label: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 20,
  },
  qrPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 20,
  },
  qrPlaceholderIcon: {
    color: '#0D0D0D',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  qrPlaceholderAddr: {
    color: '#333333',
    fontSize: 11,
    textAlign: 'center',
  },
  address: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
