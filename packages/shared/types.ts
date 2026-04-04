// ========== API contracts ==========

export interface UserBalanceResponse {
  evmAddress: string;
  evmBalance: string;
  unlinkAddress: string;
}

export interface UserCreateWebhookPayload {
  event: 'wallet.created';
  data: {
    walletAddress: string;
    userId: string;
    chain: string;
  };
}

export interface RegisterUnlinkRequest {
  unlinkAddress: string;
}

// ── Gift link contracts ──────────────────────────────────────────────

export interface CreateGiftRequest {
  senderAddress: string;
  amount: string;
  token: string;
}

export interface CreateGiftResponse {
  claimCode: string;
  claimUrl: string;
  giftAddress: string;
}

export interface GiftMetadataResponse {
  amount: string;
  token: string;
  status: 'pending' | 'claimed' | 'cancelled';
  createdAt: string;
}

export interface ClaimGiftRequest {
  receiverAddress: string;
}

export interface CancelGiftRequest {
  senderAddress: string;
}

export interface CancelGiftResponse {
  success: boolean;
  txId?: string;
  error?: string;
}

// ========== Route contract ==========
//
// POST /webhooks/dynamic
//   Body: UserCreateWebhookPayload
//   Response: 200 { received: true }
//
// GET /api/user/:walletAddress
//   Response: UserBalanceResponse
//
// PUT /api/user/:walletAddress/unlink
//   Body: RegisterUnlinkRequest
//   Response: { success: true }
//
// POST /api/gift
//   Body: CreateGiftRequest
//   Response: CreateGiftResponse
//
// GET /api/gift/:claimCode
//   Response: GiftMetadataResponse
//
// POST /api/gift/:claimCode/claim
//   Body: ClaimGiftRequest
//   Response: { success: true }
//
// POST /api/gift/:claimCode/cancel
//   Body: CancelGiftRequest
//   Response: CancelGiftResponse
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
