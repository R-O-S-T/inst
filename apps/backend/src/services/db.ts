import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.resolve('data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'wallet.db');

let db: SqlJsDatabase;

export async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      evm_address   TEXT UNIQUE NOT NULL,
      unlink_address TEXT,
      unlink_mnemonic TEXT,
      created_at    TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_code          TEXT UNIQUE NOT NULL,
      sender_evm          TEXT NOT NULL,
      amount              TEXT NOT NULL,
      token               TEXT NOT NULL,
      gift_mnemonic       TEXT NOT NULL,
      gift_unlink_address TEXT NOT NULL,
      status              TEXT DEFAULT 'pending',
      recipient_evm       TEXT,
      tx_id               TEXT,
      created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
      claimed_at          TEXT
    );
  `);

  save();
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// --------------- Exported helpers ---------------

export function createUser(evmAddress: string) {
  db.run('INSERT OR IGNORE INTO users (evm_address) VALUES (?)', [evmAddress]);
  save();
}

export function getUserByEvmAddress(evmAddress: string) {
  const stmt = db.prepare('SELECT * FROM users WHERE evm_address = ?', [evmAddress]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as { id: number; evm_address: string; unlink_address: string | null; unlink_mnemonic: string | null; created_at: string };
  }
  stmt.free();
  return undefined;
}

export function updateUserUnlink(evmAddress: string, unlinkAddress: string, mnemonic: string) {
  db.run('UPDATE users SET unlink_address = ?, unlink_mnemonic = ? WHERE evm_address = ?', [unlinkAddress, mnemonic, evmAddress]);
  save();
}

// --------------- Gift helpers ---------------

export interface GiftRow {
  id: number;
  claim_code: string;
  sender_evm: string;
  amount: string;
  token: string;
  gift_mnemonic: string;
  gift_unlink_address: string;
  status: string;
  recipient_evm: string | null;
  tx_id: string | null;
  created_at: string;
  claimed_at: string | null;
}

export function createGift(
  claimCode: string,
  senderEvm: string,
  amount: string,
  token: string,
  giftMnemonic: string,
  giftUnlinkAddress: string,
) {
  db.run(
    'INSERT INTO gifts (claim_code, sender_evm, amount, token, gift_mnemonic, gift_unlink_address) VALUES (?, ?, ?, ?, ?, ?)',
    [claimCode, senderEvm, amount, token, giftMnemonic, giftUnlinkAddress],
  );
  save();
}

export function getGiftByClaimCode(code: string): GiftRow | undefined {
  const stmt = db.prepare('SELECT * FROM gifts WHERE claim_code = ?', [code]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as GiftRow;
  }
  stmt.free();
  return undefined;
}

export function claimGift(code: string, recipientEvm: string) {
  db.run(
    "UPDATE gifts SET status = 'claimed', recipient_evm = ?, claimed_at = CURRENT_TIMESTAMP WHERE claim_code = ? AND status = 'pending'",
    [recipientEvm, code],
  );
  save();
}

export function cancelGift(code: string, txId: string) {
  db.run(
    "UPDATE gifts SET status = 'cancelled', tx_id = ? WHERE claim_code = ? AND status = 'pending'",
    [txId, code],
  );
  save();
}

export { db };
