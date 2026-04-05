import React, { useState } from 'react';
import {
  Clipboard,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface SettingsScreenProps {
  safeAddress?: string;
  owners: string[];
  isDeployed: boolean;
  onRotateKey: () => void;
  onLogout: () => void;
}

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function CopyableAddress({ address }: { address: string }) {
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePress = () => {
    setShowFull((prev) => !prev);
  };

  const handleCopy = () => {
    Clipboard.setString(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.addressRow}>
      <TouchableOpacity onPress={handlePress} style={styles.addressTextWrap}>
        <Text style={styles.addressText} numberOfLines={showFull ? 3 : 1}>
          {showFull ? address : truncateAddress(address)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
        <Text style={styles.copyButtonText}>{copied ? 'Copied' : 'Copy'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SettingsScreen({
  safeAddress,
  owners,
  isDeployed,
  onRotateKey,
  onLogout,
}: SettingsScreenProps) {
  const explorerUrl = safeAddress
    ? `https://sepolia.basescan.org/address/${safeAddress}`
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Safe Wallet Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safe Wallet</Text>
        <View style={styles.card}>
          {safeAddress ? (
            <>
              <Text style={styles.label}>Address</Text>
              <CopyableAddress address={safeAddress} />
              <View style={styles.statusRow}>
                <Text style={styles.label}>Status</Text>
                <View
                  style={[
                    styles.badge,
                    isDeployed ? styles.badgeSuccess : styles.badgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isDeployed
                        ? styles.badgeTextSuccess
                        : styles.badgeTextPending,
                    ]}
                  >
                    {isDeployed ? 'Deployed' : 'Not Deployed'}
                  </Text>
                </View>
              </View>
              {explorerUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(explorerUrl)}
                  style={styles.explorerLink}
                >
                  <Text style={styles.explorerLinkText}>
                    View on BaseScan
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.secondaryText}>No Safe address available</Text>
          )}
        </View>
      </View>

      {/* Owners Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Owners</Text>
        <View style={styles.card}>
          {owners.length > 0 ? (
            <>
              {owners.map((owner, index) => (
                <View key={owner} style={index > 0 ? styles.ownerDivider : undefined}>
                  <Text style={styles.ownerLabel}>Owner {index + 1}</Text>
                  <CopyableAddress address={owner} />
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.secondaryText}>No owners loaded</Text>
          )}
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rotateButton}
            onPress={onRotateKey}
            activeOpacity={0.7}
          >
            <Text style={styles.rotateButtonText}>Rotate Key</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  label: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  addressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copyButtonText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSuccess: {
    color: '#22C55E',
  },
  badgeTextPending: {
    color: '#EAB308',
  },
  explorerLink: {
    marginTop: 4,
  },
  explorerLinkText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryText: {
    color: '#999999',
    fontSize: 14,
  },
  ownerLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
    marginTop: 4,
  },
  ownerDivider: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 12,
    marginTop: 4,
  },
  rotateButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  rotateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
