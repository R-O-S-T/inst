import { Router } from 'express';
import type { Request, Response } from 'express';
import { getUserByEvmAddress } from '../services/db.js';
import { getBalance } from '../services/unlink.js';
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

    // Fetch EVM balance
    let evmBalance = '0x0';
    try {
      evmBalance = await fetchEvmBalance(user.evm_address);
    } catch (err) {
      logger.warn(`Failed to fetch EVM balance for ${user.evm_address}`, err);
    }

    // Fetch Unlink pool balance if user has a mnemonic
    let unlinkBalance = '0';
    if (user.unlink_mnemonic) {
      try {
        unlinkBalance = await getBalance(user.unlink_mnemonic);
      } catch (err) {
        logger.warn(`Failed to fetch Unlink balance for ${user.unlink_address}`, err);
      }
    }

    res.json({
      evmAddress: user.evm_address,
      evmBalance,
      unlinkAddress: user.unlink_address ?? '',
      unlinkBalance,
    });
  } catch (err) {
    logger.error('user route failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
