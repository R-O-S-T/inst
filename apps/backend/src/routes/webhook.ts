import { Router } from 'express';
import express from 'express';
import type { Request, Response } from 'express';
// Shared types — using relative path since workspace linking may not be set up yet.
// Switch to '@wallet-in/shared/types.js' once the monorepo workspace is configured.
import type { UserCreateWebhookPayload } from '../../../../packages/shared/types.js';
import { webhookVerify } from '../middleware/webhookVerify.js';
import { createUser, updateUserUnlink } from '../services/db.js';
import { generateUserMnemonic } from '../services/unlink.js';
import { logger } from '../utils/logger.js';

export const webhookRouter = Router();

// Use express.raw() so the body arrives as a Buffer for HMAC verification.
// webhookVerify will parse JSON after signature check.
webhookRouter.post(
  '/dynamic',
  express.raw({ type: 'application/json' }),
  webhookVerify,
  (req: Request, res: Response) => {
    const payload = req.body as UserCreateWebhookPayload;

    if (payload.event !== 'wallet.created') {
      logger.debug(`Ignoring webhook event: ${payload.event}`);
      res.status(200).json({ received: true });
      return;
    }

    const { walletAddress } = payload.data;
    logger.info(`wallet.created webhook received for ${walletAddress}`);

    // Persist user synchronously
    createUser(walletAddress);

    // Return 200 immediately; generate Unlink wallet async
    res.status(200).json({ received: true });

    // Fire-and-forget: generate mnemonic + update DB
    (async () => {
      try {
        const { mnemonic, unlinkAddress } = await generateUserMnemonic();
        updateUserUnlink(walletAddress, unlinkAddress, mnemonic);
        logger.info(`Unlink wallet created for ${walletAddress}: ${unlinkAddress}`);
      } catch (err) {
        logger.error(`Failed to create Unlink wallet for ${walletAddress}`, err);
      }
    })();
  },
);
