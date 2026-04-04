import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { QRCodeDisplay } from '../components/QRCodeDisplay';

type Tab = 'public' | 'private';

interface ReceiveScreenProps {
  evmAddress?: string;
  unlinkAddress?: string;
}

export function ReceiveScreen({ evmAddress, unlinkAddress }: ReceiveScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>('public');

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Receive</Text>

      <View style={styles.segmentControl}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'public' && styles.segmentActive]}
          onPress={() => setActiveTab('public')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'public' && styles.segmentTextActive,
            ]}
          >
            Public
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segment, activeTab === 'private' && styles.segmentActive]}
          onPress={() => setActiveTab('private')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'private' && styles.segmentTextActive,
            ]}
          >
            Private
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'public' ? (
          evmAddress ? (
            <QRCodeDisplay address={evmAddress} label="Your Public Address" />
          ) : (
            <Text style={styles.noAddress}>No public address available</Text>
          )
        ) : unlinkAddress ? (
          <QRCodeDisplay address={unlinkAddress} label="Your Private Address" />
        ) : (
          <Text style={styles.noAddress}>No private address available</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingTop: 20,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#6366F1',
  },
  segmentText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  noAddress: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
});
