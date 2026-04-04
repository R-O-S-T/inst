import { Router } from 'express';
import type { Request, Response } from 'express';
import type { SendPrivateRequest, SendPrivateResponse } from '@instant/shared/types.js';
import { getUserByEvmAddress } from '../services/db.js';
import { transferToUser } from '../services/unlink.js';
import { logger } from '../utils/logger.js';

export const sendPrivateRouter = Router();

// --------------- Rate limiting (in-memory) ---------------

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(senderAddress: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(senderAddress) ?? [];

  // Remove entries outside the window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(senderAddress, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(senderAddress, recent);
  return false;
}

// POST /api/send-private
sendPrivateRouter.post('/send-private', async (req: Request, res: Response) => {
  try {
    const { senderWalletAddress, recipientUnlinkAddress, amount, token } =
      req.body as Partial<SendPrivateRequest>;

    // ---------- Validation ----------
    if (!senderWalletAddress || !recipientUnlinkAddress || !amount || !token) {
      const response: SendPrivateResponse = {
        success: false,
        error: 'Missing required fields: senderWalletAddress, recipientUnlinkAddress, amount, token',
      };
      res.status(400).json(response);
      return;
    }

    // ---------- Rate limiting ----------
    if (isRateLimited(senderWalletAddress)) {
      const response: SendPrivateResponse = {
        success: false,
        error: 'Rate limit exceeded. Max 5 requests per minute.',
      };
      res.status(429).json(response);
      return;
    }

    // ---------- Verify sender exists ----------
    const sender = getUserByEvmAddress(senderWalletAddress);
    if (!sender) {
      const response: SendPrivateResponse = {
        success: false,
        error: 'Sender not found',
      };
      res.status(404).json(response);
      return;
    }

    // ---------- Execute transfer ----------
    logger.info(
      `send-private: from=${senderWalletAddress} to=${recipientUnlinkAddress} amount=${amount} token=${token}`,
    );

    const txHash = await transferToUser(recipientUnlinkAddress, amount, token);

    const response: SendPrivateResponse = { success: true, txHash };
    res.json(response);
  } catch (err) {
    logger.error('send-private failed', err);
    const response: SendPrivateResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
});
