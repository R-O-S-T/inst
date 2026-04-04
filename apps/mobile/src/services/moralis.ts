import { MORALIS_API_KEY } from '../config/secrets';

const BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

export interface MoralisToken {
  token_address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
  balance: string;
  balance_formatted: string;
  usd_price: number | null;
  usd_value: number | null;
  native_token: boolean;
  possible_spam: boolean;
  verified_contract: boolean;
  portfolio_percentage: number;
}

interface MoralisResponse {
  result: MoralisToken[];
  cursor?: string;
}

// ── Cache ─────────────────────────────────────────────────────────────
let cachedTokens: MoralisToken[] | null = null;
let cacheTimestamp = 0;
let cacheAddress = '';
const CACHE_TTL_MS = 60_000; // 1 minute

export async function getWalletTokens(
  walletAddress: string,
  forceRefresh = false,
): Promise<MoralisToken[]> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedTokens &&
    cacheAddress === walletAddress &&
    now - cacheTimestamp < CACHE_TTL_MS
  ) {
    return cachedTokens;
  }

  const params = new URLSearchParams({
    chain: 'base sepolia',
    exclude_spam: 'true',
  });

  const res = await fetch(
    `${BASE_URL}/wallets/${walletAddress}/tokens?${params}`,
    { headers: { 'X-API-Key': MORALIS_API_KEY } },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('[moralis] fetch failed:', res.status, text);
    return cachedTokens || [];
  }

  const data = (await res.json()) as MoralisResponse;

  // Sort: native first, then by USD value descending
  const tokens = data.result
    .filter((t) => parseFloat(t.balance_formatted) > 0 || t.native_token)
    .sort((a, b) => {
      if (a.native_token && !b.native_token) return -1;
      if (!a.native_token && b.native_token) return 1;
      return (b.usd_value ?? 0) - (a.usd_value ?? 0);
    });

  cachedTokens = tokens;
  cacheTimestamp = now;
  cacheAddress = walletAddress;

  return tokens;
}

export function clearTokenCache() {
  cachedTokens = null;
  cacheTimestamp = 0;
}

// ── Wallet History ───────────────────────────────────────────────────

export interface MoralisNativeTransfer {
  value_formatted: string;
  token_symbol: string;
}

export interface MoralisErc20Transfer {
  value_formatted: string;
  token_symbol: string;
  token_logo: string | null;
  address: string;
}

export interface MoralisHistoryItem {
  hash: string;
  from_address: string;
  to_address: string;
  value: string;
  block_timestamp: string;
  category: string;
  summary: string;
  native_transfers: MoralisNativeTransfer[];
  erc20_transfers: MoralisErc20Transfer[];
}

interface MoralisHistoryResponse {
  result: MoralisHistoryItem[];
  cursor?: string;
}

let cachedHistory: MoralisHistoryItem[] | null = null;
let historyCacheTimestamp = 0;
let historyCacheAddress = '';
const HISTORY_CACHE_TTL_MS = 30_000; // 30 seconds

export async function getWalletHistory(
  walletAddress: string,
  chain = 'base sepolia',
  forceRefresh = false,
): Promise<MoralisHistoryItem[]> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedHistory &&
    historyCacheAddress === walletAddress &&
    now - historyCacheTimestamp < HISTORY_CACHE_TTL_MS
  ) {
    return cachedHistory;
  }

  const params = new URLSearchParams({ chain });

  const res = await fetch(
    `${BASE_URL}/wallets/${walletAddress}/history?${params}`,
    { headers: { 'X-API-Key': MORALIS_API_KEY } },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('[moralis] history fetch failed:', res.status, text);
    return cachedHistory || [];
  }

  const data = (await res.json()) as MoralisHistoryResponse;

  cachedHistory = data.result ?? [];
  historyCacheTimestamp = now;
  historyCacheAddress = walletAddress;

  return cachedHistory;
}

export function clearHistoryCache() {
  cachedHistory = null;
  historyCacheTimestamp = 0;
}
