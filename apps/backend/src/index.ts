import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { webhookRouter } from './routes/webhook.js';
import { sendPrivateRouter } from './routes/sendPrivate.js';
import { userRouter } from './routes/user.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { initDb } from './services/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- Middleware ---------------
app.use(helmet());
app.use(cors());

// Mount webhook routes BEFORE express.json() so the webhook handler
// can use express.raw() for HMAC signature verification on the raw body.
app.use('/webhooks', webhookRouter);

app.use(express.json());

// --------------- Routes ---------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api', sendPrivateRouter);
app.use('/api', userRouter);

// --------------- Error handling ---------------
app.use(errorHandler);

// --------------- Start ---------------
initDb().then(() => {
  app.listen(PORT, () => {
    logger.info(`Backend listening on port ${PORT}`);
  });
}).catch((err) => {
  logger.error('Failed to initialize database', err);
  process.exit(1);
});

export default app;
