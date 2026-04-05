import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { dynamicClient } from '../../client';
import { useWallet } from '../hooks/useWallet';

interface AuthScreenProps {
  onImageLogin?: (imageBytes: Uint8Array, password?: string) => Promise<void>;
}

export function AuthScreen({ onImageLogin }: AuthScreenProps) {
  const { isLoading } = useWallet();
  const [imageLoading, setImageLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingImageBytes, setPendingImageBytes] = useState<Uint8Array | null>(null);

  const handleSignIn = async () => {
    await dynamicClient.ui.auth.show();
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      // Read the image file as base64, then convert to Uint8Array
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Store bytes and show password modal
      setPendingImageBytes(bytes);
      setShowPasswordModal(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to pick image');
    }
  };

  const handlePasswordSubmit = () => {
    if (!pendingImageBytes || !onImageLogin) return;

    const bytes = pendingImageBytes;
    const pw = password.trim().length > 0 ? password.trim() : undefined;

    setShowPasswordModal(false);
    setPassword('');
    setImageLoading(true);

    setTimeout(async () => {
      try {
        await onImageLogin(bytes, pw);
      } catch (err: any) {
        Alert.alert('Image Login Failed', err?.message || 'Could not authenticate with image');
      } finally {
        setImageLoading(false);
        setPendingImageBytes(null);
      }
    }, 100);
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPendingImageBytes(null);
    setPassword('');
  };

  const loading = isLoading || imageLoading;


  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.appName}>Instant</Text>
          <Text style={styles.tagline}>Private payments, instantly</Text>
        </View>

        <View style={styles.card}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>
                {imageLoading ? 'Deriving key from image...' : 'Loading...'}
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.button}
                onPress={handleSignIn}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageIconButton}
                onPress={handleImagePick}
                activeOpacity={0.7}
              >
                <Text style={styles.imageIcon}>🖼</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Password input modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={handlePasswordCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Dismiss keyboard on tap outside input */}
            <Text style={styles.modalTitle}>Enter Password</Text>
            <Text style={styles.modalSubtitle}>
              Optional password for additional security. Leave blank if you did not set one.
            </Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Password (optional)"
              placeholderTextColor="#666666"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handlePasswordCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handlePasswordSubmit}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#999999',
  },
  card: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  imageIconButton: {
    position: 'absolute',
    top: -60,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIcon: {
    fontSize: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    color: '#999999',
    fontSize: 14,
    marginTop: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#999999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  passwordInput: {
    width: '100%',
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
