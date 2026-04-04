// ========== API contracts ==========

export interface SendPrivateRequest {
  senderWalletAddress: string;
  recipientUnlinkAddress: string;
  amount: string;
  token: string;
}

export interface SendPrivateResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface UserBalanceResponse {
  evmAddress: string;
  evmBalance: string;
  unlinkAddress: string;
  unlinkBalance: string;
}

export interface UserCreateWebhookPayload {
  event: 'wallet.created';
  data: {
    walletAddress: string;
    userId: string;
    chain: string;
  };
}

// ========== Route contract ==========
//
// POST /webhooks/dynamic
//   Body: UserCreateWebhookPayload
//   Response: 200 { received: true }
//
// POST /api/send-private
//   Body: SendPrivateRequest
//   Response: SendPrivateResponse
//
// GET /api/user/:walletAddress
//   Response: UserBalanceResponse
//
// GET /api/health
//   Response: { status: 'ok', timestamp: number }

// ========== Shared data shapes ==========

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  mode: 'public' | 'private';
  amount: string;
  token: string;
  counterparty: string;
  txHash?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface WalletState {
  evmAddress: string;
  unlinkAddress: string;
  evmBalance: string;
  unlinkBalance: string;
  isLoading: boolean;
}

// ========== Constants ==========

export const CHAIN_CONFIG = {
  id: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
} as const;

export const UNLINK_CONTRACT = '0x647f9b99af97e4b79DD9Dd6de3b583236352f482';

export const isUnlinkAddress = (addr: string): boolean => addr.startsWith('unlink1');
export const isEvmAddress = (addr: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(addr);
