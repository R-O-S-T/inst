import { Router } from 'express';
import type { Request, Response } from 'express';
import { getUserByEvmAddress, updateUserUnlink, createUser } from '../services/db.js';
import { logger } from '../utils/logger.js';

export const userRouter = Router();

const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

async function fetchEvmBalance(address: string): Promise<string> {
  const response = await fetch(BASE_SEPOLIA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  });

  const data = (await response.json()) as { result?: string; error?: { message: string } };

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result ?? '0x0';
}

// GET /api/user/:walletAddress
userRouter.get('/user/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const user = getUserByEvmAddress(walletAddress);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let evmBalance = '0x0';
    try {
      evmBalance = await fetchEvmBalance(user.evm_address);
    } catch (err) {
      logger.warn(`Failed to fetch EVM balance for ${user.evm_address}`, err);
    }

    res.json({
      evmAddress: user.evm_address,
      evmBalance,
      unlinkAddress: user.unlink_address ?? '',
    });
  } catch (err) {
    logger.error('user route failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/:walletAddress/unlink — client registers its Unlink address
userRouter.put('/user/:walletAddress/unlink', (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { unlinkAddress } = req.body ?? {};

    if (!unlinkAddress || typeof unlinkAddress !== 'string') {
      res.status(400).json({ error: 'Missing required field: unlinkAddress' });
      return;
    }

    if (!unlinkAddress.startsWith('unlink1')) {
      res.status(400).json({ error: 'Invalid Unlink address format (must start with unlink1)' });
      return;
    }

    // Auto-create user if webhook hasn't fired yet (idempotent)
    let user = getUserByEvmAddress(walletAddress);
    if (!user) {
      createUser(walletAddress);
      user = getUserByEvmAddress(walletAddress);
    }

    updateUserUnlink(walletAddress, unlinkAddress);

    logger.info(`Unlink address registered: ${walletAddress} → ${unlinkAddress}`);

    res.json({ success: true });
  } catch (err) {
    logger.error('PUT /api/user/:walletAddress/unlink failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
