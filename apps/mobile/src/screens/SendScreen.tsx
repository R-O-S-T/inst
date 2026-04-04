import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isEvmAddress, isUnlinkAddress } from '../types';
import { formatBalance } from '../utils/format';
import { AddressInput } from '../components/AddressInput';
import { AmountInput } from '../components/AmountInput';
import { ConfirmModal } from '../components/ConfirmModal';

type TokenType = 'ETH' | 'ULNKm';

interface SendScreenProps {
  evmBalance?: string;
  unlinkBalance?: string;
  senderAddress?: string;
  prefillAddress?: string;
  onSendPublic?: (to: string, amount: string, token: TokenType) => Promise<string>;
  onSendPrivate?: (to: string, amount: string) => Promise<string>;
  onSendPrivateToEvm?: (to: string, amount: string) => Promise<string>;
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
  onSendPrivateToEvm,
}: SendScreenProps) {
  const [address, setAddress] = useState(prefillAddress);
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenType>('ULNKm');
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | undefined>();

  const addressType: AddressType = useMemo(() => {
    if (isEvmAddress(address)) return 'evm';
    if (isUnlinkAddress(address)) return 'unlink';
    return null;
  }, [address]);

  // unlink1... is always private; 0x... can be public or private
  const mode = addressType === 'unlink' ? 'private' : (isPrivateMode ? 'private' : 'public');

  const currentBalance = useMemo(() => {
    if (addressType === 'unlink') return formatBalance(unlinkBalance);
    return formatBalance(evmBalance);
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
      if (mode === 'private' && addressType === 'unlink' && onSendPrivate) {
        hash = await onSendPrivate(address, amount);
      } else if (mode === 'private' && addressType === 'evm' && onSendPrivateToEvm) {
        hash = await onSendPrivateToEvm(address, amount);
      } else if (mode === 'public' && onSendPublic) {
        hash = await onSendPublic(address, amount, selectedToken);
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

  if (!senderAddress) {
    return (
      <View style={styles.screen}>
        <View style={styles.centered}>
          <Text style={styles.connectText}>Connect wallet to send</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Send</Text>

        <Text style={styles.senderLabel}>From: {senderAddress}</Text>

        <AddressInput
          value={address}
          onChange={setAddress}
          addressType={addressType}
        />

        {addressType === 'evm' && (
          <View style={styles.tokenSelector}>
            <Pressable
              style={[styles.tokenOption, !isPrivateMode && styles.tokenOptionActive]}
              onPress={() => setIsPrivateMode(false)}
            >
              <Text style={[styles.tokenOptionText, !isPrivateMode && styles.tokenOptionTextActive]}>
                Public
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tokenOption, isPrivateMode && styles.privacyOptionActive]}
              onPress={() => { setIsPrivateMode(true); setSelectedToken('ULNKm'); }}
            >
              <Text style={[styles.tokenOptionText, isPrivateMode && styles.tokenOptionTextActive]}>
                Private
              </Text>
            </Pressable>
          </View>
        )}

        {addressType !== 'unlink' && !isPrivateMode && (
          <View style={styles.tokenSelector}>
            <Pressable
              style={[styles.tokenOption, selectedToken === 'ETH' && styles.tokenOptionActive]}
              onPress={() => setSelectedToken('ETH')}
            >
              <Text style={[styles.tokenOptionText, selectedToken === 'ETH' && styles.tokenOptionTextActive]}>
                ETH
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tokenOption, selectedToken === 'ULNKm' && styles.tokenOptionActive]}
              onPress={() => setSelectedToken('ULNKm')}
            >
              <Text style={[styles.tokenOptionText, selectedToken === 'ULNKm' && styles.tokenOptionTextActive]}>
                ULNKm
              </Text>
            </Pressable>
          </View>
        )}

        <AmountInput
          value={amount}
          onChange={setAmount}
          maxBalance={currentBalance}
          token={addressType === 'unlink' ? 'ULNKm' : selectedToken}
        />

        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            pressed && canSend && styles.sendButtonPressed,
          ]}
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
  sendButtonPressed: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sendButtonTextDisabled: {
    color: '#666666',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectText: {
    color: '#999999',
    fontSize: 16,
  },
  tokenSelector: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
  },
  tokenOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tokenOptionActive: {
    backgroundColor: '#6366F1',
  },
  privacyOptionActive: {
    backgroundColor: '#8B5CF6',
  },
  tokenOptionText: {
    color: '#999999',
    fontSize: 15,
    fontWeight: '600',
  },
  tokenOptionTextActive: {
    color: '#FFFFFF',
  },
});
