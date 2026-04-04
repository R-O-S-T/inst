import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isEvmAddress, isUnlinkAddress } from '../types';
import { TOKENS, TokenInfo } from '../services/unlinkClient';
import { getWalletTokens, MoralisToken } from '../services/moralis';
import { AddressInput } from '../components/AddressInput';
import { ConfirmModal } from '../components/ConfirmModal';

// ── Types ────────────────────────────────────────────────────────────

interface SendScreenProps {
  balances?: Record<string, string>;
  unlinkBalance?: string;
  senderAddress?: string;
  prefillAddress?: string;
  onSendPublic?: (to: string, amount: string, token: string) => Promise<string>;
  onSendPrivate?: (to: string, amount: string, token: string) => Promise<string>;
  onSendPrivateToEvm?: (to: string, amount: string, token: string) => Promise<string>;
}

type Step = 1 | 2 | 3;
type AddressType = 'evm' | 'unlink' | null;
type TxStatus = 'idle' | 'pending' | 'success' | 'error';

const PERCENT_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: 'Max', value: 1 },
];

const NUMPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

// ── Component ────────────────────────────────────────────────────────

export function SendScreen({
  balances = {},
  unlinkBalance = '0',
  senderAddress,
  prefillAddress = '',
  onSendPublic,
  onSendPrivate,
  onSendPrivateToEvm,
}: SendScreenProps) {
  const navigation = useNavigation<any>();

  // Flow state
  const [step, setStep] = useState<Step>(1);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState(prefillAddress);

  // Moralis token list
  const [moralisTokens, setMoralisTokens] = useState<MoralisToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);

  // Confirm modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | undefined>();

  // Fetch tokens from Moralis (cached)
  useEffect(() => {
    if (!senderAddress) return;
    setTokensLoading(true);
    getWalletTokens(senderAddress)
      .then(setMoralisTokens)
      .catch((err) => console.warn('[Send] moralis fetch failed', err))
      .finally(() => setTokensLoading(false));
  }, [senderAddress, step]); // refetch when returning to step 1

  // ── Derived values ──

  const addressType: AddressType = useMemo(() => {
    if (isEvmAddress(address)) return 'evm';
    if (isUnlinkAddress(address)) return 'unlink';
    return null;
  }, [address]);

  const mode = addressType === 'unlink' ? 'private' : isPrivateMode ? 'private' : 'public';

  const tokenSymbol = selectedToken?.symbol ?? 'ULNKm';

  const currentBalance = useMemo(() => {
    if (!selectedToken) return '0';
    if (isPrivateMode) return unlinkBalance;
    // Try Moralis data first, fall back to on-chain balances
    const moralisEntry = moralisTokens.find(
      (t) => t.symbol.toUpperCase() === selectedToken.symbol.toUpperCase(),
    );
    if (moralisEntry) return moralisEntry.balance_formatted;
    return balances[selectedToken.symbol] || '0';
  }, [selectedToken, isPrivateMode, balances, unlinkBalance, moralisTokens]);

  const filteredMoralisTokens = useMemo(() => {
    const tokens = moralisTokens.length > 0 ? moralisTokens : [];
    if (!searchQuery.trim()) return tokens;
    const q = searchQuery.toLowerCase();
    return tokens.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    );
  }, [searchQuery, moralisTokens]);

  const amountNum = parseFloat(amount) || 0;

  // ── Handlers ──

  const goToBalance = () => {
    navigation.navigate('Balance');
  };

  const handleTokenSelect = (mt: MoralisToken) => {
    const token: TokenInfo = {
      symbol: mt.symbol,
      address: mt.native_token ? '' : mt.token_address,
      decimals: mt.decimals,
      isNative: mt.native_token,
    };
    setSelectedToken(token);
    setAmount('');
    setStep(2);
  };

  const handleNumpadPress = (key: string) => {
    if (key === 'backspace') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (amount.includes('.')) return;
      setAmount((prev) => (prev === '' ? '0.' : prev + '.'));
      return;
    }
    // Prevent leading zeros like "00", "01" etc
    setAmount((prev) => {
      if (prev === '0' && key !== '.') return key;
      return prev + key;
    });
  };

  const handlePercentPress = (pct: number) => {
    const bal = parseFloat(currentBalance) || 0;
    const val = bal * pct;
    if (val <= 0) return;
    // Format: remove trailing zeros but keep reasonable precision
    const formatted = val.toFixed(selectedToken?.decimals === 6 ? 6 : 8).replace(/0+$/, '').replace(/\.$/, '');
    setAmount(formatted);
  };

  const handleSendPress = () => {
    if (!addressType || amountNum <= 0) return;
    setTxStatus('idle');
    setTxHash(undefined);
    setModalVisible(true);
  };

  const handleConfirm = useCallback(async () => {
    setTxStatus('pending');
    try {
      let hash: string | undefined;
      console.log(`[Send] mode=${mode} addressType=${addressType} token=${tokenSymbol} amount=${amount} to=${address}`);
      if (mode === 'private' && addressType === 'unlink' && onSendPrivate) {
        console.log('[Send] calling onSendPrivate');
        hash = await onSendPrivate(address, amount, tokenSymbol);
      } else if (mode === 'private' && addressType === 'evm' && onSendPrivateToEvm) {
        console.log('[Send] calling onSendPrivateToEvm');
        hash = await onSendPrivateToEvm(address, amount, tokenSymbol);
      } else if (mode === 'public' && onSendPublic) {
        console.log('[Send] calling onSendPublic');
        hash = await onSendPublic(address, amount, tokenSymbol);
      } else {
        console.log('[Send] no handler matched');
      }
      console.log('[Send] success, hash:', hash);
      setTxHash(hash);
      setTxStatus('success');
    } catch (err: any) {
      console.error('[Send] failed:', err?.message || err);
      console.error('[Send] full error:', JSON.stringify(err, null, 2));
      setTxStatus('error');
    }
  }, [address, amount, mode, addressType, tokenSymbol, onSendPublic, onSendPrivate, onSendPrivateToEvm]);

  const handleCancel = () => {
    setModalVisible(false);
    if (txStatus === 'success') {
      // Reset flow
      setStep(1);
      setSelectedToken(null);
      setAmount('');
      setAddress('');
      setSearchQuery('');
    }
    setTxStatus('idle');
    setTxHash(undefined);
  };

  // ── Guard: no wallet ──

  if (!senderAddress) {
    return (
      <View style={styles.screen}>
        <View style={styles.centered}>
          <Text style={styles.connectText}>Connect wallet to send</Text>
        </View>
      </View>
    );
  }

  // ── Step 1: Token Select ──

  if (step === 1) {
    return (
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={goToBalance}>
            <Text style={styles.headerArrow}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Send</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.content}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tokens"
              placeholderTextColor="#666666"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Token list */}
          {tokensLoading && moralisTokens.length === 0 && (
            <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
          )}
          <FlatList
            data={filteredMoralisTokens}
            keyExtractor={(item) => item.token_address || 'native'}
            renderItem={({ item }) => (
              <Pressable
                style={styles.tokenRow}
                onPress={() => handleTokenSelect(item)}
              >
                <View style={styles.tokenLeft}>
                  {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.tokenLogo} />
                  ) : (
                    <View style={styles.tokenLogoPlaceholder}>
                      <Text style={styles.tokenLogoText}>{item.symbol[0]}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                    <Text style={styles.tokenName}>{item.name}</Text>
                  </View>
                </View>
                <View style={styles.tokenRight}>
                  <Text style={styles.tokenBalance}>{item.balance_formatted}</Text>
                  {item.usd_value != null && item.usd_value > 0 && (
                    <Text style={styles.tokenUsd}>${item.usd_value.toFixed(2)}</Text>
                  )}
                </View>
              </Pressable>
            )}
            contentContainerStyle={styles.tokenList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    );
  }

  // ── Step 2: Amount Entry ──

  if (step === 2) {
    return (
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={() => {
              setAmount('');
              setStep(1);
            }}
          >
            <Text style={styles.headerArrow}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Send</Text>
          <Pressable
            style={styles.headerButton}
            onPress={() => {
              setAmount('');
              setStep(1);
            }}
          >
            <Text style={styles.headerClose}>{'\u2715'}</Text>
          </Pressable>
        </View>

        {/* Amount display area */}
        <View style={styles.amountDisplayArea}>
          <Text
            style={[
              styles.amountText,
              amountNum > 0 && styles.amountTextActive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {amount || '0'} {tokenSymbol}
          </Text>
          <Text style={styles.balanceHint}>
            {currentBalance} {tokenSymbol} available
          </Text>
        </View>

        {/* Bottom fixed section */}
        <View style={styles.amountBottom}>
          {/* Percent buttons */}
          <View style={styles.percentRow}>
            {PERCENT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                style={styles.percentButton}
                onPress={() => handlePercentPress(opt.value)}
              >
                <Text style={styles.percentText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Numpad */}
          <View style={styles.numpad}>
            {NUMPAD_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.numpadRow}>
                {row.map((key) => (
                  <Pressable
                    key={key}
                    style={styles.numpadButton}
                    onPress={() => handleNumpadPress(key)}
                  >
                    <Text style={styles.numpadText}>
                      {key === 'backspace' ? '\u232B' : key}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          {/* Next button */}
          {amountNum > 0 && (
            <Pressable
              style={styles.nextButton}
              onPress={() => setStep(3)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // ── Step 3: Address + Confirm ──

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => setStep(2)}
        >
          <Text style={styles.headerArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Send {amount} {tokenSymbol}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.stepContentInner}
        keyboardShouldPersistTaps="handled"
      >
        <AddressInput
          value={address}
          onChange={setAddress}
          addressType={addressType}
        />

        {/* Privacy toggle — only for non-native tokens */}
        {selectedToken && !selectedToken.isNative && (
          <View style={styles.privacyRow}>
            <Text style={styles.privacyLabel}>Send privately</Text>
            <Switch
              value={isPrivateMode}
              onValueChange={setIsPrivateMode}
              trackColor={{ false: '#2A2A2A', true: '#8B5CF6' }}
              thumbColor={isPrivateMode ? '#FFFFFF' : '#999999'}
            />
          </View>
        )}

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>
              {amount} {tokenSymbol}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Token</Text>
            <Text style={styles.summaryValue}>{tokenSymbol}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mode</Text>
            <View
              style={[
                styles.modeBadge,
                {
                  backgroundColor:
                    mode === 'private'
                      ? 'rgba(139, 92, 246, 0.15)'
                      : 'rgba(99, 102, 241, 0.15)',
                },
              ]}
            >
              <Text
                style={[
                  styles.modeBadgeText,
                  {
                    color:
                      mode === 'private' ? '#8B5CF6' : '#6366F1',
                  },
                ]}
              >
                {mode === 'private' ? 'Private' : 'Public'}
              </Text>
            </View>
          </View>
        </View>

        {/* Send button */}
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            !addressType && styles.sendButtonDisabled,
            pressed && !!addressType && styles.sendButtonPressed,
          ]}
          onPress={handleSendPress}
          disabled={!addressType}
        >
          <Text
            style={[
              styles.sendButtonText,
              !addressType && styles.sendButtonTextDisabled,
            ]}
          >
            Send
          </Text>
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={modalVisible}
        recipient={address}
        amount={amount}
        mode={mode}
        token={tokenSymbol}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        status={txStatus}
        txHash={txHash}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  headerClose: {
    color: '#999999',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── Step 1: Token Select ──
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  privacyLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tokenList: {
    paddingBottom: 20,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  tokenLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tokenLogoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tokenSymbol: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tokenName: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  tokenUsd: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },

  // ── Step 2: Amount Entry ──
  amountDisplayArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  amountText: {
    color: '#999999',
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  amountTextActive: {
    color: '#FFFFFF',
  },
  balanceHint: {
    color: '#999999',
    fontSize: 14,
    marginTop: 8,
  },
  amountBottom: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  percentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  percentButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  percentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  numpad: {
    gap: 8,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numpadButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Step 3: Address + Confirm ──
  stepContent: {
    flex: 1,
  },
  stepContentInner: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  summaryLabel: {
    color: '#999999',
    fontSize: 14,
  },
  summaryValue: {
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
  sendButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
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
});
