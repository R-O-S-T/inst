import type {
  SendPrivateRequest,
  SendPrivateResponse,
  UserBalanceResponse,
  CreateGiftResponse,
  GiftMetadataResponse,
} from '../types';

export const BACKEND_URL = 'https://inst-production-030c.up.railway.app';
const TIMEOUT_MS = 10_000;

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ApiError(body || `Request failed with status ${res.status}`, res.status);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out');
    }
    throw new ApiError(err instanceof Error ? err.message : 'Unknown network error');
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchUserBalance(walletAddress: string): Promise<UserBalanceResponse> {
  return request<UserBalanceResponse>(
    `${BACKEND_URL}/api/user/${encodeURIComponent(walletAddress)}`,
  );
}

export async function sendPrivate(req: SendPrivateRequest): Promise<SendPrivateResponse> {
  return request<SendPrivateResponse>(`${BACKEND_URL}/api/send-private`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

// ── Gift endpoints ───────────────────────────────────────────────────

export async function createGift(
  senderAddress: string,
  amount: string,
  token: string,
): Promise<CreateGiftResponse> {
  return request<CreateGiftResponse>(`${BACKEND_URL}/api/gift`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderAddress, amount, token }),
  });
}

export async function getGiftMetadata(claimCode: string): Promise<GiftMetadataResponse> {
  return request<GiftMetadataResponse>(
    `${BACKEND_URL}/api/gift/${encodeURIComponent(claimCode)}`,
  );
}

export async function claimGift(
  claimCode: string,
  receiverAddress: string,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `${BACKEND_URL}/api/gift/${encodeURIComponent(claimCode)}/claim`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverAddress }),
    },
  );
}

export async function registerUnlinkAddress(
  walletAddress: string,
  unlinkAddress: string,
  maxRetries = 5,
  delayMs = 2000,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await request<{ success: boolean }>(
        `${BACKEND_URL}/api/user/${encodeURIComponent(walletAddress)}/unlink`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unlinkAddress }),
        },
      );
      return;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404 && i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
}
