import { Router } from 'express';
import type { Request, Response } from 'express';

export const userRouter = Router();

// GET /api/user/:walletAddress
userRouter.get('/user/:walletAddress', (_req: Request, res: Response) => {
  // TODO: look up user balances from DB + chain
  res.json({ todo: true });
});
