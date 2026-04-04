import { Router } from 'express';
import type { Request, Response } from 'express';
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
    const { senderWalletAddress, recipientUnlinkAddress, amount, token } = req.body ?? {};

    // ---------- Validation ----------
    if (!senderWalletAddress || !recipientUnlinkAddress || !amount || !token) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: senderWalletAddress, recipientUnlinkAddress, amount, token',
      });
      return;
    }

    // ---------- Rate limiting ----------
    if (isRateLimited(senderWalletAddress)) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Max 5 requests per minute.',
      });
      return;
    }

    // ---------- Verify sender exists and has Unlink wallet ----------
    const sender = getUserByEvmAddress(senderWalletAddress);
    if (!sender) {
      res.status(404).json({ success: false, error: 'Sender not found' });
      return;
    }

    if (!sender.unlink_mnemonic) {
      res.status(400).json({ success: false, error: 'Sender has no Unlink wallet' });
      return;
    }

    // ---------- Execute private transfer ----------
    logger.info(
      `send-private: from=${senderWalletAddress} to=${recipientUnlinkAddress} amount=${amount}`,
    );

    const txId = await transferToUser(sender.unlink_mnemonic, recipientUnlinkAddress, amount);

    res.json({ success: true, txHash: txId });
  } catch (err) {
    logger.error('send-private failed', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
