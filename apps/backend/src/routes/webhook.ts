import { Router } from 'express';
import type { Request, Response } from 'express';

export const webhookRouter = Router();

// POST /webhooks/dynamic
webhookRouter.post('/dynamic', (_req: Request, res: Response) => {
  // TODO: validate webhook signature, call createUser + generate Unlink wallet
  res.json({ todo: true });
});
