import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Middleware that verifies Dynamic webhook signatures using HMAC-SHA256.
 *
 * Expects the route to use `express.raw({ type: 'application/json' })` so that
 * `req.body` is a raw Buffer. After verification the parsed JSON is attached
 * to `req.body` for downstream handlers.
 */
export function webhookVerify(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.DYNAMIC_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('DYNAMIC_WEBHOOK_SECRET is not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const signature = req.headers['x-dynamic-signature'];
  if (!signature || typeof signature !== 'string') {
    logger.warn('Missing x-dynamic-signature header');
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  // req.body should be a Buffer when express.raw() is used
  const rawBody: Buffer = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    logger.warn('Webhook signature mismatch');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // Parse the raw body into JSON for downstream handlers
  try {
    req.body = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    logger.error('Failed to parse webhook body as JSON', err);
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  next();
}
