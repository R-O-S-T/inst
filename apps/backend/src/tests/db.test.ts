import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initDb,
  createUser,
  getUserByEvmAddress,
  updateUserUnlink,
  createGift,
  getGiftByClaimCode,
  claimGift,
  cancelGift,
} from '../services/db.js';

// Use a temp data dir so tests don't pollute the real DB
const TEST_DATA_DIR = path.resolve('data-test');

before(async () => {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }
  // Override DATA_DIR by setting cwd-relative 'data' to our test dir
  // Since db.ts uses path.resolve('data'), we rely on the existing DB being
  // re-initialized fresh (in-memory) when no file exists.
  // For isolation, just delete the real data dir's db if it exists.
  const realDb = path.resolve('data', 'wallet.db');
  if (fs.existsSync(realDb)) {
    fs.renameSync(realDb, realDb + '.bak');
  }
  await initDb();
});

after(() => {
  // Restore backed-up DB if it existed
  const realDb = path.resolve('data', 'wallet.db');
  const backup = realDb + '.bak';
  if (fs.existsSync(backup)) {
    // Remove test-created db first
    if (fs.existsSync(realDb)) fs.unlinkSync(realDb);
    fs.renameSync(backup, realDb);
  }
});

// ── Users (existing functionality still works) ──────────────────────

describe('users table', () => {
  it('createUser + getUserByEvmAddress', () => {
    createUser('0xSender1');
    const user = getUserByEvmAddress('0xSender1');
    assert.ok(user);
    assert.equal(user.evm_address, '0xSender1');
    assert.equal(user.unlink_address, null);
  });

  it('createUser is idempotent (INSERT OR IGNORE)', () => {
    createUser('0xSender1');
    createUser('0xSender1');
    const user = getUserByEvmAddress('0xSender1');
    assert.ok(user);
  });

  it('getUserByEvmAddress returns undefined for unknown address', () => {
    const user = getUserByEvmAddress('0xNonexistent');
    assert.equal(user, undefined);
  });

  it('updateUserUnlink sets unlink fields', () => {
    createUser('0xSender2');
    updateUserUnlink('0xSender2', 'unlink1abc');
    const user = getUserByEvmAddress('0xSender2');
    assert.ok(user);
    assert.equal(user.unlink_address, 'unlink1abc');
  });
});

// ── Gifts (new functionality) ───────────────────────────────────────

describe('gifts table', () => {
  it('createGift + getGiftByClaimCode', () => {
    createGift('code123', '0xSender1', '1000000', '0xToken', 'gift mnemonic', 'unlink1gift');
    const gift = getGiftByClaimCode('code123');
    assert.ok(gift);
    assert.equal(gift.claim_code, 'code123');
    assert.equal(gift.sender_evm, '0xSender1');
    assert.equal(gift.amount, '1000000');
    assert.equal(gift.token, '0xToken');
    assert.equal(gift.gift_mnemonic, 'gift mnemonic');
    assert.equal(gift.gift_unlink_address, 'unlink1gift');
    assert.equal(gift.status, 'pending');
    assert.equal(gift.recipient_evm, null);
    assert.equal(gift.tx_id, null);
    assert.equal(gift.claimed_at, null);
  });

  it('getGiftByClaimCode returns undefined for unknown code', () => {
    const gift = getGiftByClaimCode('nonexistent');
    assert.equal(gift, undefined);
  });

  it('claimGift sets status + recipient + timestamp', () => {
    createGift('code_claim', '0xSender1', '500', '0xToken', 'mnem', 'unlink1x');
    claimGift('code_claim', '0xReceiver1');
    const gift = getGiftByClaimCode('code_claim');
    assert.ok(gift);
    assert.equal(gift.status, 'claimed');
    assert.equal(gift.recipient_evm, '0xReceiver1');
    assert.ok(gift.claimed_at, 'claimed_at should be set');
  });

  it('claimGift does nothing if already claimed', () => {
    // code_claim was already claimed above
    claimGift('code_claim', '0xSomeoneElse');
    const gift = getGiftByClaimCode('code_claim');
    assert.ok(gift);
    assert.equal(gift.recipient_evm, '0xReceiver1'); // unchanged
  });

  it('cancelGift sets status + tx_id', () => {
    createGift('code_cancel', '0xSender1', '200', '0xToken', 'mnem', 'unlink1y');
    cancelGift('code_cancel', '0xTxHash123');
    const gift = getGiftByClaimCode('code_cancel');
    assert.ok(gift);
    assert.equal(gift.status, 'cancelled');
    assert.equal(gift.tx_id, '0xTxHash123');
  });

  it('cancelGift does nothing if already claimed', () => {
    // code_claim is already claimed
    cancelGift('code_claim', '0xRefundTx');
    const gift = getGiftByClaimCode('code_claim');
    assert.ok(gift);
    assert.equal(gift.status, 'claimed'); // unchanged
    assert.equal(gift.tx_id, null); // unchanged
  });

  it('duplicate claim_code throws (UNIQUE constraint)', () => {
    createGift('code_dup', '0xSender1', '100', '0xToken', 'mnem', 'unlink1z');
    assert.throws(() => {
      createGift('code_dup', '0xSender1', '999', '0xToken', 'mnem2', 'unlink1w');
    });
  });
});
