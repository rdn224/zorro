// Promise-based API for the UI: every repo function, executed in the database worker.
import type * as repo from './repo';
import type { SqlDb } from './types';

type Repo = typeof repo;
type Api = {
  [K in keyof Repo]: Repo[K] extends (db: SqlDb, ...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : never;
};

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
let nextId = 1;

worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
  const p = pending.get(e.data.id);
  if (!p) return;
  pending.delete(e.data.id);
  if (e.data.error !== undefined) p.reject(new Error(e.data.error));
  else p.resolve(e.data.result);
};

function call(method: string, args: unknown[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, method, args });
  });
}

export const api = new Proxy({} as Api, {
  get: (_, method: string) => (...args: unknown[]) => call(method, args),
});

/** Resolves once the database is open; rejects if it cannot be opened. */
export const dbReady: Promise<void> = call('ping', []);

// The database allows a single connection, so release it before hot-reloading.
if (import.meta.hot) import.meta.hot.dispose(() => worker.terminate());
