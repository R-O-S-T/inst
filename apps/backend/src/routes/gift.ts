import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { getUserByEvmAddress, createGift, getGiftByClaimCode, claimGift } from '../services/db.js';
import { generateGiftWallet } from '../services/unlink.js';
import { logger } from '../utils/logger.js';

export const giftRouter = Router();

const GIFT_BASE_URL = process.env.GIFT_BASE_URL || 'https://app.example.com/claim/';

// POST /api/gift — sender creates a gift link
giftRouter.post('/gift', async (req: Request, res: Response) => {
  try {
    const { senderAddress, amount, token } = req.body ?? {};

    if (!senderAddress || !amount || !token) {
      res.status(400).json({ error: 'Missing required fields: senderAddress, amount, token' });
      return;
    }

    const sender = getUserByEvmAddress(senderAddress);
    if (!sender) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    if (!sender.unlink_address) {
      res.status(400).json({ error: 'Sender has no Unlink wallet registered' });
      return;
    }

    const { mnemonic, unlinkAddress } = await generateGiftWallet();
    const claimCode = crypto.randomBytes(16).toString('hex');

    createGift(claimCode, senderAddress, amount, token, mnemonic, unlinkAddress);

    logger.info(`Gift created: code=${claimCode} sender=${senderAddress} amount=${amount} giftAddr=${unlinkAddress}`);

    res.status(201).json({
      claimCode,
      claimUrl: `${GIFT_BASE_URL}${claimCode}`,
      giftAddress: unlinkAddress,
      giftMnemonic: mnemonic,
    });
  } catch (err) {
    logger.error('POST /api/gift failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/gift/:claimCode — public metadata (no sensitive data)
giftRouter.get('/gift/:claimCode', (req: Request, res: Response) => {
  try {
    const gift = getGiftByClaimCode(req.params.claimCode);
    if (!gift) {
      res.status(404).json({ error: 'Gift not found' });
      return;
    }

    res.json({
      amount: gift.amount,
      token: gift.token,
      status: gift.status,
      createdAt: gift.created_at,
    });
  } catch (err) {
    logger.error('GET /api/gift/:claimCode failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/gift/:claimCode/claim — receiver marks gift as claimed
giftRouter.post('/gift/:claimCode/claim', (req: Request, res: Response) => {
  try {
    const { receiverAddress } = req.body ?? {};

    if (!receiverAddress) {
      res.status(400).json({ error: 'Missing required field: receiverAddress' });
      return;
    }

    const gift = getGiftByClaimCode(req.params.claimCode);
    if (!gift) {
      res.status(404).json({ error: 'Gift not found' });
      return;
    }

    if (gift.status !== 'pending') {
      res.status(409).json({ error: `Gift already ${gift.status}` });
      return;
    }

    const receiver = getUserByEvmAddress(receiverAddress);
    if (!receiver) {
      res.status(404).json({ error: 'Receiver not found' });
      return;
    }

    claimGift(req.params.claimCode, receiverAddress);

    logger.info(`Gift claimed: code=${req.params.claimCode} receiver=${receiverAddress}`);

    res.json({ success: true });
  } catch (err) {
    logger.error('POST /api/gift/:claimCode/claim failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
