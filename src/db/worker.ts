/// <reference lib="webworker" />
// Owns the SQLite database (stored in the phone's private file system, OPFS)
// and runs repository calls sent from the UI thread.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import * as repo from './repo';
import { migrate } from './schema';
import type { SqlDb, SqlValue } from './types';

async function open(): Promise<SqlDb> {
  const sqlite3 = await sqlite3InitModule();
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'zorro' });
  const raw = new pool.OpfsSAHPoolDb('/zorro.db');
  const db: SqlDb = {
    all: (sql, bind?: SqlValue[]) => raw.selectObjects(sql, bind),
    run: (sql, bind?: SqlValue[]) => {
      raw.exec({ sql, bind });
    },
  };
  migrate(db);
  return db;
}

// No in-memory fallback on purpose: silently losing orders would be worse than an error.
const ready = open();

self.onmessage = async (e: MessageEvent<{ id: number; method: string; args: unknown[] }>) => {
  const { id, method, args } = e.data;
  try {
    const db = await ready;
    if (method === 'ping') return self.postMessage({ id, result: true });
    const fn = (repo as Record<string, unknown>)[method];
    if (typeof fn !== 'function') throw new Error(`Unknown method: ${method}`);
    self.postMessage({ id, result: fn(db, ...args) });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
