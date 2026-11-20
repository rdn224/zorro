/// <reference lib="webworker" />
// Owns the SQLite database (stored in the phone's private file system, OPFS)
// and runs repository calls sent from the UI thread.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import * as repo from './repo';
import { migrate } from './schema';
import type { SqlDb, SqlValue } from './types';

type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;

/**
 * Safari can refuse the storage file handles on the first attempt (for example right after
 * the previous page or worker closed) and grant them a moment later, so retry a few times.
 * preserveOnInitFailure is essential: without it a failed attempt deletes the stored data.
 */
async function installPool(sqlite3: Sqlite3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      // forceReinitIfPreviouslyFailed is supported by the library but missing from its typings.
      const options = {
        name: 'zorro',
        preserveOnInitFailure: true,
        forceReinitIfPreviouslyFailed: true,
      };
      return await sqlite3.installOpfsSAHPoolVfs(options);
    } catch (e) {
      lastError = e;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  const e = lastError as { name?: string; message?: string };
  throw new Error(`${e?.name ?? 'Error'}: ${e?.message ?? String(lastError)}`);
}

async function open(): Promise<SqlDb> {
  const sqlite3 = await sqlite3InitModule();
  const pool = await installPool(sqlite3);
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
