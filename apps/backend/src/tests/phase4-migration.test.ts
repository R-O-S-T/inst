// Prevent index.ts from auto-starting the server
process.env.TEST = '1';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { initDb, createUser, updateUserUnlink, getUserByEvmAddress } from '../services/db.js';

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
  const realDb = path.resolve('data', 'wallet.db');
  if (fs.existsSync(realDb)) fs.renameSync(realDb, realDb + '.bak');

  await initDb();

  createUser('0xMigrationUser');
  createUser('0xWithUnlink');
  updateUserUnlink('0xWithUnlink', 'unlink1existing');

  const { default: app } = await import('../index.js');
  server = app.listen(0);
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

// ── updateUserUnlink now takes 2 args ───────────────────────────────

describe('db.ts — updateUserUnlink (2-arg signature)', () => {
  it('sets unlink_address without mnemonic', () => {
    updateUserUnlink('0xMigrationUser', 'unlink1migrated');
    const user = getUserByEvmAddress('0xMigrationUser');
    assert.ok(user);
    assert.equal(user.unlink_address, 'unlink1migrated');
    // unlink_mnemonic column still exists in DB (SELECT *) but the TS type no longer exposes it.
    // Runtime object may have the key but it should be null since we never wrote it.
    assert.equal((user as Record<string, unknown>).unlink_mnemonic, null);
  });
});

// ── GET /api/user/:walletAddress — no unlinkBalance ─────────────────

describe('GET /api/user/:walletAddress (simplified)', () => {
  it('returns user without unlinkBalance', async () => {
    const { status, data } = await request('GET', '/api/user/0xWithUnlink');
    assert.equal(status, 200);
    assert.equal(data.evmAddress, '0xWithUnlink');
    assert.equal(data.unlinkAddress, 'unlink1existing');
    assert.ok('evmBalance' in data);
    assert.equal('unlinkBalance' in data, false, 'response should not include unlinkBalance');
  });

  it('returns 404 for unknown user', async () => {
    const { status } = await request('GET', '/api/user/0xNobody');
    assert.equal(status, 404);
  });
});

// ── PUT /api/user/:walletAddress/unlink ─────────────────────────────

describe('PUT /api/user/:walletAddress/unlink', () => {
  it('registers Unlink address', async () => {
    const { status, data } = await request('PUT', '/api/user/0xMigrationUser/unlink', {
      unlinkAddress: 'unlink1newaddr',
    });
    assert.equal(status, 200);
    assert.equal(data.success, true);

    const user = getUserByEvmAddress('0xMigrationUser');
    assert.equal(user?.unlink_address, 'unlink1newaddr');
  });

  it('returns 400 if unlinkAddress missing', async () => {
    const { status } = await request('PUT', '/api/user/0xMigrationUser/unlink', {});
    assert.equal(status, 400);
  });

  it('returns 400 if unlinkAddress has wrong format', async () => {
    const { status } = await request('PUT', '/api/user/0xMigrationUser/unlink', {
      unlinkAddress: '0xNotAnUnlinkAddress',
    });
    assert.equal(status, 400);
  });

  it('returns 404 if user does not exist', async () => {
    const { status } = await request('PUT', '/api/user/0xNobody/unlink', {
      unlinkAddress: 'unlink1whatever',
    });
    assert.equal(status, 404);
  });
});
