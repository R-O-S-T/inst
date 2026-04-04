import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface AmountInputProps {
  value: string;
  onChange: (text: string) => void;
  maxBalance: string;
  token: string;
}

const ETH_USD_RATE = 2000;

export function AmountInput({ value, onChange, maxBalance, token }: AmountInputProps) {
  const numericValue = parseFloat(value) || 0;
  const usdEquivalent = (numericValue * ETH_USD_RATE).toFixed(2);

  const handleMax = () => {
    onChange(maxBalance);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Amount</Text>
        <Text style={styles.balanceLabel}>
          Balance: {maxBalance} {token}
        </Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="0.0"
          placeholderTextColor="#666666"
          keyboardType="decimal-pad"
          autoCorrect={false}
        />
        <Text style={styles.tokenLabel}>{token}</Text>
        <Pressable style={styles.maxButton} onPress={handleMax}>
          <Text style={styles.maxText}>Max</Text>
        </Pressable>
      </View>
      {numericValue > 0 && (
        <Text style={styles.usdText}>~${usdEquivalent} USD</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#999999',
    fontSize: 14,
  },
  balanceLabel: {
    color: '#999999',
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tokenLabel: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  maxButton: {
    marginLeft: 8,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  maxText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  usdText: {
    color: '#999999',
    fontSize: 13,
    marginTop: 8,
  },
});
