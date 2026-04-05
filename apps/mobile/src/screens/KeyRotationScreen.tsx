import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import type { SmartAccountClient } from 'permissionless';
import { toBytes } from 'viem';
import { sha256 } from '@noble/hashes/sha256';

import { deriveKeyFromImage, type ImageKeyResult } from '../lib/image-key';
import { rotateSafeOwner } from '../lib/rotate';
import { getPublicClient } from '../lib/safe-client';
import {
  encryptUnlinkSeed,
  storeEncryptedSeed,
} from '../lib/unlink-seed-handoff';
import { dynamicClient } from '../../client';

export interface KeyRotationScreenProps {
  safeAddress: string;
  currentOwner: string;
  smartAccountClient: SmartAccountClient;
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'pick' | 'password' | 'derive' | 'acknowledge' | 'rotate' | 'success';

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function KeyRotationScreen({
  safeAddress,
  currentOwner,
  smartAccountClient,
  onComplete,
  onCancel,
}: KeyRotationScreenProps) {
  const [step, setStep] = useState<Step>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState('');
  const [derivedResult, setDerivedResult] = useState<ImageKeyResult | null>(null);
  const [isDeriving, setIsDeriving] = useState(false);
  const [mnemonicSaved, setMnemonicSaved] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Step 1: Pick image
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;

      // Read image as base64 then convert to Uint8Array
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      setImageUri(uri);
      setImageBytes(bytes);
      setStep('password');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to pick image');
    }
  };

  // Step 3: Derive key
  const handleDeriveKey = async () => {
    if (!imageBytes) return;

    setIsDeriving(true);
    try {
      // Use setTimeout to let the UI update with the spinner before heavy computation
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          try {
            const pw = password.trim().length > 0 ? password.trim() : undefined;
            const result = deriveKeyFromImage(imageBytes, pw);
            setDerivedResult(result);
            setStep('acknowledge');
          } catch (err: any) {
            Alert.alert('Derivation Failed', err?.message || 'Failed to derive key from image');
          }
          resolve();
        }, 100);
      });
    } finally {
      setIsDeriving(false);
    }
  };

  // Step 5: Rotate
  const handleRotate = () => {
    if (!derivedResult) return;

    Alert.alert(
      'Rotate Key?',
      `This will remove your current login key (${truncateAddress(currentOwner)}) and replace it with ${truncateAddress(derivedResult.address)}. You will need the original image to sign in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rotate', style: 'destructive', onPress: executeRotation },
      ],
    );
  };

  const executeRotation = async () => {
    if (!derivedResult) return;

    setStep('rotate');
    setIsRotating(true);

    try {
      // 1. Derive and encrypt the Unlink seed (non-fatal if it fails)
      try {
        const wallet = dynamicClient.wallets.userWallets[0];
        if (wallet) {
          const sig = await dynamicClient.wallets.signMessage({
            wallet,
            message: 'unlink-seed-v1',
          });
          const unlinkSeed = toBytes(sha256(toBytes(sig)));
          const imagePrivKeyBytes = toBytes(derivedResult.privateKey);
          const encrypted = encryptUnlinkSeed(unlinkSeed, imagePrivKeyBytes);
          await storeEncryptedSeed(encrypted);
          console.log('[KeyRotation] Unlink seed encrypted and stored');
        } else {
          console.warn('[KeyRotation] No Dynamic wallet found for Unlink seed');
        }
      } catch (err: any) {
        console.warn('[KeyRotation] Unlink seed encryption failed (non-fatal):', err?.message);
      }

      // 2. Execute the key rotation
      const txHash = await rotateSafeOwner({
        smartAccountClient,
        publicClient: getPublicClient(),
        safeAddress: safeAddress as `0x${string}`,
        newOwnerAddress: derivedResult.address,
      });

      console.log('[KeyRotation] Rotation tx hash:', txHash);
      setStep('success');
    } catch (err: any) {
      Alert.alert(
        'Rotation Failed',
        err?.message || 'Failed to rotate key. Please try again.',
      );
      setStep('acknowledge');
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopyAddress = (address: string) => {
    Clipboard.setString(address);
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  const handleCopyMnemonic = () => {
    if (derivedResult) {
      Clipboard.setString(derivedResult.mnemonic);
      Alert.alert('Copied', 'Mnemonic copied to clipboard');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Rotate Key</Text>
        <View style={styles.backButton} />
      </View>

      {/* Step 1: Pick Image */}
      <View style={styles.stepSection}>
        <Text style={styles.stepLabel}>Step 1</Text>
        <Text style={styles.stepTitle}>Select Image</Text>
        <Text style={styles.stepDescription}>
          Choose an image that will be used to derive your new key. You will need this exact image to sign in.
        </Text>
        {imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Select Image</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Step 2: Password (visible after image picked) */}
      {(step === 'password' || step === 'derive' || step === 'acknowledge' || step === 'rotate' || step === 'success') && (
        <View style={styles.stepSection}>
          <Text style={styles.stepLabel}>Step 2</Text>
          <Text style={styles.stepTitle}>Enter Password</Text>
          <Text style={styles.stepDescription}>
            Adding a password strengthens your key. Leave blank if you prefer not to use one.
          </Text>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password (strongly recommended)"
            placeholderTextColor="#666666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={step === 'password'}
          />
          {step === 'password' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleDeriveKey}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Derive Key</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Step 3: Deriving indicator */}
      {isDeriving && (
        <View style={styles.stepSection}>
          <Text style={styles.stepLabel}>Step 3</Text>
          <Text style={styles.stepTitle}>Deriving Key</Text>
          <View style={styles.derivingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.derivingText}>
              Deriving key from image...
            </Text>
          </View>
        </View>
      )}

      {/* Step 3 result + Step 4: Acknowledge (visible after derivation) */}
      {derivedResult && (step === 'acknowledge' || step === 'rotate' || step === 'success') && (
        <>
          <View style={styles.stepSection}>
            <Text style={styles.stepLabel}>Step 3</Text>
            <Text style={styles.stepTitle}>Derived Key</Text>

            <View style={styles.derivedInfoCard}>
              <View style={styles.derivedInfoRow}>
                <Text style={styles.derivedInfoLabel}>Address</Text>
                <TouchableOpacity
                  onPress={() => handleCopyAddress(derivedResult.address)}
                >
                  <Text style={styles.derivedInfoValue}>
                    {truncateAddress(derivedResult.address)} (tap to copy)
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.derivedInfoRow}>
                <Text style={styles.derivedInfoLabel}>Fingerprint</Text>
                <Text style={styles.derivedInfoValue}>
                  {derivedResult.fingerprint}
                </Text>
              </View>
            </View>

            <Text style={styles.mnemonicLabel}>24-Word Mnemonic</Text>
            <TouchableOpacity onPress={handleCopyMnemonic} activeOpacity={0.8}>
              <View style={styles.mnemonicBox}>
                <View style={styles.mnemonicGrid}>
                  {derivedResult.mnemonic.split(' ').map((word, index) => (
                    <View key={index} style={styles.mnemonicWord}>
                      <Text style={styles.mnemonicIndex}>{index + 1}.</Text>
                      <Text style={styles.mnemonicText}>{word}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.mnemonicCopyHint}>Tap to copy</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Step 4: Acknowledge backup */}
          {(step === 'acknowledge' || step === 'rotate') && (
            <View style={styles.stepSection}>
              <Text style={styles.stepLabel}>Step 4</Text>
              <Text style={styles.stepTitle}>Confirm Backup</Text>
              <View style={styles.acknowledgeRow}>
                <Switch
                  value={mnemonicSaved}
                  onValueChange={setMnemonicSaved}
                  trackColor={{ false: '#2A2A2A', true: '#6366F1' }}
                  thumbColor={mnemonicSaved ? '#FFFFFF' : '#999999'}
                />
                <Text style={styles.acknowledgeText}>
                  I have saved my 24-word mnemonic
                </Text>
              </View>

              {/* Step 5: Rotate button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !mnemonicSaved && styles.disabledButton,
                ]}
                onPress={handleRotate}
                activeOpacity={0.7}
                disabled={!mnemonicSaved}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    !mnemonicSaved && styles.disabledButtonText,
                  ]}
                >
                  Rotate Key
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Step 5: Rotating spinner */}
      {isRotating && (
        <View style={styles.stepSection}>
          <View style={styles.rotatingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.rotatingText}>Rotating key...</Text>
            <Text style={styles.rotatingSubtext}>
              This may take 10-30 seconds
            </Text>
          </View>
        </View>
      )}

      {/* Step 6: Success */}
      {step === 'success' && (
        <View style={styles.stepSection}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Key Rotated Successfully</Text>
            <Text style={styles.successDescription}>
              Sign in with your image next time.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onComplete}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '500',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  stepSection: {
    marginBottom: 28,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#999999',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#2A2A2A',
  },
  disabledButtonText: {
    color: '#666666',
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    marginBottom: 12,
  },
  changeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeImageText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  passwordInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  derivingContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  derivingText: {
    color: '#999999',
    fontSize: 14,
    marginTop: 16,
  },
  derivedInfoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  derivedInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  derivedInfoLabel: {
    fontSize: 13,
    color: '#999999',
  },
  derivedInfoValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  mnemonicLabel: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 8,
  },
  mnemonicBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mnemonicWord: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '33.33%',
    paddingVertical: 4,
  },
  mnemonicIndex: {
    fontSize: 11,
    color: '#666666',
    width: 22,
    fontFamily: 'monospace',
  },
  mnemonicText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  mnemonicCopyHint: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    marginTop: 10,
  },
  acknowledgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  acknowledgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  rotatingContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  rotatingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
  },
  rotatingSubtext: {
    color: '#999999',
    fontSize: 13,
    marginTop: 8,
  },
  successContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 8,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 24,
    textAlign: 'center',
  },
});
