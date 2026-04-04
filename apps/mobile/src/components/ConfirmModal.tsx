import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatAddress } from '../utils/format';

interface ConfirmModalProps {
  visible: boolean;
  recipient: string;
  amount: string;
  mode: 'public' | 'private';
  onConfirm: () => void;
  onCancel: () => void;
  status: 'idle' | 'pending' | 'success' | 'error';
  txHash?: string;
}

export function ConfirmModal({
  visible,
  recipient,
  amount,
  mode,
  onConfirm,
  onCancel,
  status,
  txHash,
}: ConfirmModalProps) {
  const isPublic = mode === 'public';
  const modeColor = isPublic ? '#3B82F6' : '#8B5CF6';
  const modeLabel = isPublic ? 'Public' : 'Private';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm Transaction</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>To</Text>
            <Text style={styles.rowValue}>{formatAddress(recipient)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Amount</Text>
            <Text style={styles.rowValue}>{amount} ETH</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Mode</Text>
            <View style={[styles.modeBadge, { backgroundColor: `${modeColor}20` }]}>
              <Text style={[styles.modeBadgeText, { color: modeColor }]}>
                {modeLabel}
              </Text>
            </View>
          </View>

          {status === 'pending' && (
            <View style={styles.statusContainer}>
              <ActivityIndicator color="#6366F1" size="large" />
              <Text style={styles.statusText}>Sending...</Text>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusIcon}>&#x2713;</Text>
              {isPublic && txHash ? (
                <Text style={styles.statusText}>Tx: {txHash.slice(0, 10)}...{txHash.slice(-6)}</Text>
              ) : (
                <Text style={styles.statusText}>Private transfer complete</Text>
              )}
            </View>
          )}

          {status === 'error' && (
            <View style={styles.statusContainer}>
              <Text style={styles.errorIcon}>&#x2717;</Text>
              <Text style={styles.errorText}>Transaction failed</Text>
            </View>
          )}

          {(status === 'idle' || status === 'error') && (
            <View style={styles.buttonRow}>
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={onConfirm}>
                <Text style={styles.confirmText}>Confirm</Text>
              </Pressable>
            </View>
          )}

          {status === 'success' && (
            <Pressable style={styles.doneButton} onPress={onCancel}>
              <Text style={styles.confirmText}>Done</Text>
            </Pressable>
          )}

          {status === 'pending' && (
            <View style={styles.buttonRow}>
              <View style={styles.disabledButton}>
                <Text style={styles.disabledText}>Sending...</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  rowLabel: {
    color: '#999999',
    fontSize: 14,
  },
  rowValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modeBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  modeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusIcon: {
    color: '#22C55E',
    fontSize: 40,
    fontWeight: '700',
  },
  statusText: {
    color: '#999999',
    fontSize: 14,
    marginTop: 8,
  },
  errorIcon: {
    color: '#EF4444',
    fontSize: 40,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    marginTop: 20,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
});
