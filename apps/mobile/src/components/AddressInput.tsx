import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface AddressInputProps {
  value: string;
  onChange: (text: string) => void;
  addressType: 'evm' | 'unlink' | null;
}

export function AddressInput({ value, onChange, addressType }: AddressInputProps) {
  // Clipboard paste not available without native module — user can long-press the input to paste

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recipient</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="0x... or unlink1..."
          placeholderTextColor="#666666"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {addressType === 'unlink' && (
        <View style={[styles.badge, styles.badgePrivate]}>
          <Text style={styles.badgePrivateText}>Private send</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 12,
  },
  label: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  pasteButton: {
    marginLeft: 8,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pasteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgePublic: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  badgePublicText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  badgePrivate: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  badgePrivateText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '600',
  },
});
