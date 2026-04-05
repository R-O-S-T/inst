import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { webhookRouter } from './routes/webhook.js';
import { userRouter } from './routes/user.js';
import { giftRouter } from './routes/gift.js';
import { claimPageRouter } from './routes/claimPage.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { initDb, getExpiredPendingGifts, cancelGift, getUserByEvmAddress } from './services/db.js';
import { transferFromGiftWallet } from './services/unlink.js';

const GIFT_EXPIRY_MS = Number(process.env.GIFT_EXPIRY_MS) || 300_000; // default 5 min

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- Middleware ---------------
app.use(helmet());
app.use(cors());

// Mount webhook routes BEFORE express.json() so the webhook handler
// can use express.raw() for HMAC signature verification on the raw body.
app.use('/webhooks', webhookRouter);

app.use(express.json());

// --------------- Static files (APK download) ---------------
app.use('/public', express.static('public'));

// --------------- Claim landing page (before API routes) ---------------
app.use(claimPageRouter);

// --------------- Routes ---------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api', userRouter);
app.use('/api', giftRouter);

// --------------- Error handling ---------------
app.use(errorHandler);

// --------------- Auto-expiry ---------------
async function refundExpiredGifts() {
  const expired = getExpiredPendingGifts(GIFT_EXPIRY_MS);
  for (const gift of expired) {
    try {
      const sender = getUserByEvmAddress(gift.sender_evm);
      if (!sender?.unlink_address) {
        logger.warn(`Auto-expiry: sender ${gift.sender_evm} has no unlink address, skipping code=${gift.claim_code}`);
        continue;
      }
      const txId = await transferFromGiftWallet(gift.gift_mnemonic, sender.unlink_address, gift.amount);
      cancelGift(gift.claim_code, txId);
      logger.info(`Auto-expired gift: code=${gift.claim_code} txId=${txId}`);
    } catch (err) {
      logger.error(`Auto-expiry failed for code=${gift.claim_code}`, err);
    }
  }
}

// --------------- Start ---------------
if (!process.env.TEST) {
  initDb().then(() => {
    setInterval(refundExpiredGifts, 60_000);

    app.listen(PORT, () => {
      logger.info(`Backend listening on port ${PORT}`);
    });
  }).catch((err) => {
    logger.error('Failed to initialize database', err);
    process.exit(1);
  });
}

export default app;
