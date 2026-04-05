import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { entropyToMnemonic } from '@scure/bip39';
// @ts-ignore — runtime export, missing .d.ts
import { wordlist } from '@scure/bip39/wordlists/english';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

import { dynamicClient } from '../../client';
import { useWallet } from '../hooks/useWallet';
import { getGiftMetadata, claimGift } from '../services/api';
import { createUnlinkFromMnemonic, ULNKM, TOKEN_BY_SYMBOL } from '../services/unlinkClient';
import type { GiftMetadataResponse } from '../types';

type ClaimStep = 'loading' | 'preview' | 'claiming' | 'success' | 'error' | 'expired';

interface ClaimScreenProps {
  claimCode: string;
  entropyHex: string;
  safeAddress: `0x${string}` | null;
  unlinkAddress: string;
  onClaimComplete: () => void;
}

const viemPublicClient = createPublicClient({ chain: baseSepolia, transport: http() });

export function ClaimScreen({
  claimCode,
  entropyHex,
  safeAddress,
  unlinkAddress,
  onClaimComplete,
}: ClaimScreenProps) {
  const { wallets } = useWallet();
  const [step, setStep] = useState<ClaimStep>('loading');
  const [metadata, setMetadata] = useState<GiftMetadataResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!claimCode) return;
    getGiftMetadata(claimCode)
      .then((data) => {
        setMetadata(data);
        setStep(data.status === 'pending' ? 'preview' : 'expired');
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Failed to load gift');
        setStep('error');
      });
  }, [claimCode]);

  const executeClaim = useCallback(async () => {
    if (!metadata || !safeAddress || !unlinkAddress || !entropyHex) return;
    setStep('claiming');

    try {
      const entropyBytes = new Uint8Array(
        (entropyHex.match(/.{2}/g) || []).map((b) => parseInt(b, 16)),
      );
      const giftMnemonic = entropyToMnemonic(entropyBytes, wordlist);

      const wallet = wallets[0];
      if (!wallet) throw new Error('No wallet available');

      const walletClient = await dynamicClient.viem.createWalletClient({
        wallet,
        chain: baseSepolia,
      });

      const giftClient = createUnlinkFromMnemonic(walletClient, viemPublicClient, giftMnemonic);
      await giftClient.ensureRegistered();

      const tokenInfo = TOKEN_BY_SYMBOL[metadata.token];
      const tokenAddress = tokenInfo?.address || ULNKM.address;

      const result = await giftClient.transfer({
        recipientAddress: unlinkAddress,
        token: tokenAddress,
        amount: metadata.amount,
      });
      await giftClient.pollTransactionStatus(result.txId);

      await claimGift(claimCode, safeAddress);

      setStep('success');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Claim failed');
      setStep('error');
    }
  }, [metadata, safeAddress, unlinkAddress, entropyHex, wallets, claimCode]);

  if (step === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.statusText}>Loading gift...</Text>
      </View>
    );
  }

  if (step === 'expired') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>&#9203;</Text>
        <Text style={styles.title}>Gift Unavailable</Text>
        <Text style={styles.statusText}>
          This gift has already been {metadata?.status || 'claimed'}.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onClaimComplete}>
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'preview' && metadata) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>&#127873;</Text>
        <Text style={styles.title}>Someone sent you</Text>
        <Text style={styles.amount}>{metadata.amount} {metadata.token}</Text>
        <TouchableOpacity style={styles.button} onPress={executeClaim}>
          <Text style={styles.buttonText}>Claim</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'claiming') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.statusText}>Claiming your tokens...</Text>
        <Text style={styles.substep}>This may take a few seconds</Text>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>&#9989;</Text>
        <Text style={styles.title}>Claimed!</Text>
        <Text style={styles.statusText}>
          You received {metadata?.amount} {metadata?.token}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onClaimComplete}>
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>&#10060;</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.statusText}>{errorMsg}</Text>
      <TouchableOpacity style={styles.button} onPress={executeClaim}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onClaimComplete}>
        <Text style={styles.secondaryButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  amount: { color: '#6366F1', fontSize: 32, fontWeight: '700', marginBottom: 32 },
  statusText: { color: '#999999', fontSize: 16, textAlign: 'center', marginTop: 16 },
  substep: { color: '#666666', fontSize: 14, marginTop: 8 },
  button: { backgroundColor: '#6366F1', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 24 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  secondaryButton: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 24 },
  secondaryButtonText: { color: '#999999', fontSize: 16 },
});
