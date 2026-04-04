import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isEvmAddress, isUnlinkAddress } from '../types';
import { formatBalance } from '../utils/format';
import { AddressInput } from '../components/AddressInput';
import { AmountInput } from '../components/AmountInput';
import { ConfirmModal } from '../components/ConfirmModal';

interface SendScreenProps {
  evmBalance?: string;
  unlinkBalance?: string;
  senderAddress?: string;
  prefillAddress?: string;
  onSendPublic?: (to: string, amount: string) => Promise<string>;
  onSendPrivate?: (to: string, amount: string) => Promise<string>;
}

type AddressType = 'evm' | 'unlink' | null;
type TxStatus = 'idle' | 'pending' | 'success' | 'error';

export function SendScreen({
  evmBalance = '0',
  unlinkBalance = '0',
  senderAddress,
  prefillAddress = '',
  onSendPublic,
  onSendPrivate,
}: SendScreenProps) {
  const [address, setAddress] = useState(prefillAddress);
  const [amount, setAmount] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | undefined>();

  const addressType: AddressType = useMemo(() => {
    if (isEvmAddress(address)) return 'evm';
    if (isUnlinkAddress(address)) return 'unlink';
    return null;
  }, [address]);

  const mode = addressType === 'unlink' ? 'private' : 'public';

  const currentBalance = useMemo(() => {
    const raw = addressType === 'unlink' ? unlinkBalance : evmBalance;
    return formatBalance(raw);
  }, [addressType, evmBalance, unlinkBalance]);

  const canSend = addressType !== null && parseFloat(amount) > 0;

  const handleSendPress = () => {
    if (!canSend) return;
    setTxStatus('idle');
    setTxHash(undefined);
    setModalVisible(true);
  };

  const handleConfirm = useCallback(async () => {
    setTxStatus('pending');
    try {
      let hash: string | undefined;
      if (mode === 'private' && onSendPrivate) {
        hash = await onSendPrivate(address, amount);
      } else if (mode === 'public' && onSendPublic) {
        hash = await onSendPublic(address, amount);
      }
      setTxHash(hash);
      setTxStatus('success');
    } catch {
      setTxStatus('error');
    }
  }, [address, amount, mode, onSendPublic, onSendPrivate]);

  const handleCancel = () => {
    setModalVisible(false);
    if (txStatus === 'success') {
      setAddress('');
      setAmount('');
    }
    setTxStatus('idle');
    setTxHash(undefined);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Send</Text>

        {senderAddress && (
          <Text style={styles.senderLabel}>From: {senderAddress}</Text>
        )}

        <AddressInput
          value={address}
          onChange={setAddress}
          addressType={addressType}
        />

        <AmountInput
          value={amount}
          onChange={setAmount}
          maxBalance={currentBalance}
          token="ETH"
        />

        <Pressable
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSendPress}
          disabled={!canSend}
        >
          <Text style={[styles.sendButtonText, !canSend && styles.sendButtonTextDisabled]}>
            {addressType === 'unlink' ? 'Send Privately' : 'Send'}
          </Text>
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        recipient={address}
        amount={amount}
        mode={mode}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        status={txStatus}
        txHash={txHash}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 48,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  senderLabel: {
    color: '#999999',
    fontSize: 13,
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sendButtonTextDisabled: {
    color: '#666666',
  },
});
