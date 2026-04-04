import type { SendPrivateRequest, SendPrivateResponse, UserBalanceResponse } from '../types';

const BACKEND_URL = 'http://localhost:3000';
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
