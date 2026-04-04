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

export { db };
