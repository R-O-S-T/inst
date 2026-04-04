import { Router } from 'express';
import type { Request, Response } from 'express';

export const sendPrivateRouter = Router();

// POST /api/send-private
sendPrivateRouter.post('/send-private', (_req: Request, res: Response) => {
  // TODO: implement private send via Unlink SDK
  res.json({ todo: true });
});
