// Prevent index.ts from auto-starting the server
process.env.TEST = '1';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { initDb, createUser, updateUserUnlink, createGift, claimGift } from '../services/db.js';

// We need to boot the express app. Since gift creation calls generateGiftWallet()
// which hits the Unlink staging API, we mock unlink.ts at the module level.
// For now, test the routes that DON'T call Unlink (metadata, claim, validation errors).
// The POST /api/gift route is tested structurally.

let server: http.Server;
let baseUrl: string;

async function request(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options: http.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode!, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode!, data: { raw } });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

before(async () => {
  // Clean DB for isolation
  const realDb = path.resolve('data', 'wallet.db');
  if (fs.existsSync(realDb)) {
    fs.renameSync(realDb, realDb + '.bak');
  }

  await initDb();

  // Seed test users
  createUser('0xSenderGift');
  updateUserUnlink('0xSenderGift', 'unlink1sender');
  createUser('0xReceiverGift');
  updateUserUnlink('0xReceiverGift', 'unlink1receiver');
  createUser('0xNoUnlink'); // user without unlink address

  // Manually insert a gift for testing GET/claim/cancel without hitting Unlink API
  createGift('testcode123', '0xSenderGift', '1000000', '0xToken', 'gift_mnem', 'unlink1gift');
  createGift('testcode_claimed', '0xSenderGift', '500', '0xToken', 'gift_mnem2', 'unlink1gift2');

  // Pre-claim one gift
  claimGift('testcode_claimed', '0xReceiverGift');

  // Import the app and start server
  const { default: app } = await import('../index.js');
  server = app.listen(0); // random port
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3099;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  if (server) server.close();
  const realDb = path.resolve('data', 'wallet.db');
  const backup = realDb + '.bak';
  if (fs.existsSync(backup)) {
    if (fs.existsSync(realDb)) fs.unlinkSync(realDb);
    fs.renameSync(backup, realDb);
  }
});

// ── Health check (sanity) ───────────────────────────────────────────

describe('health check', () => {
  it('GET /api/health returns 200', async () => {
    const { status, data } = await request('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
  });
});

// ── GET /api/gift/:claimCode ────────────────────────────────────────

describe('GET /api/gift/:claimCode', () => {
  it('returns gift metadata for valid code', async () => {
    const { status, data } = await request('GET', '/api/gift/testcode123');
    assert.equal(status, 200);
    assert.equal(data.amount, '1000000');
    assert.equal(data.token, '0xToken');
    assert.equal(data.status, 'pending');
    assert.ok(data.createdAt);
  });

  it('returns 404 for unknown code', async () => {
    const { status } = await request('GET', '/api/gift/nonexistent');
    assert.equal(status, 404);
  });

  it('does not expose mnemonic in response', async () => {
    const { data } = await request('GET', '/api/gift/testcode123');
    assert.equal((data as Record<string, unknown>).giftMnemonic, undefined);
    assert.equal((data as Record<string, unknown>).gift_mnemonic, undefined);
    assert.equal((data as Record<string, unknown>).mnemonic, undefined);
  });
});

// ── POST /api/gift/:claimCode/claim ─────────────────────────────────

describe('POST /api/gift/:claimCode/claim', () => {
  it('returns 400 if receiverAddress missing', async () => {
    const { status } = await request('POST', '/api/gift/testcode123/claim', {});
    assert.equal(status, 400);
  });

  it('returns 404 for unknown code', async () => {
    const { status } = await request('POST', '/api/gift/nonexistent/claim', {
      receiverAddress: '0xReceiverGift',
    });
    assert.equal(status, 404);
  });

  it('returns 409 for already-claimed gift', async () => {
    const { status, data } = await request('POST', '/api/gift/testcode_claimed/claim', {
      receiverAddress: '0xReceiverGift',
    });
    assert.equal(status, 409);
    assert.match(data.error as string, /already claimed/);
  });

  it('returns 404 if receiver not in DB', async () => {
    const { status } = await request('POST', '/api/gift/testcode123/claim', {
      receiverAddress: '0xUnknownUser',
    });
    assert.equal(status, 404);
  });

  it('successfully claims a pending gift', async () => {
    const { status, data } = await request('POST', '/api/gift/testcode123/claim', {
      receiverAddress: '0xReceiverGift',
    });
    assert.equal(status, 200);
    assert.equal(data.success, true);
  });

  it('cannot claim the same gift twice', async () => {
    const { status } = await request('POST', '/api/gift/testcode123/claim', {
      receiverAddress: '0xReceiverGift',
    });
    assert.equal(status, 409);
  });
});

// ── POST /api/gift (create) — validation only ───────────────────────

describe('POST /api/gift (validation)', () => {
  it('returns 400 if fields missing', async () => {
    const { status } = await request('POST', '/api/gift', { senderAddress: '0xSenderGift' });
    assert.equal(status, 400);
  });

  it('returns 404 if sender not in DB', async () => {
    const { status } = await request('POST', '/api/gift', {
      senderAddress: '0xNobody',
      amount: '100',
      token: '0xToken',
    });
    assert.equal(status, 404);
  });

  it('returns 400 if sender has no Unlink address', async () => {
    const { status } = await request('POST', '/api/gift', {
      senderAddress: '0xNoUnlink',
      amount: '100',
      token: '0xToken',
    });
    assert.equal(status, 400);
  });

  // Note: successful creation calls generateGiftWallet which hits Unlink API.
  // That's an integration test — skip in unit tests.
});
