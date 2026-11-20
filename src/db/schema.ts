import type { SqlDb } from './types';

/** Each entry upgrades the schema by one version (tracked in PRAGMA user_version). */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    phone2 TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pizza', 'drink')),
    price INTEGER NOT NULL CHECK (price >= 0),
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    created_at TEXT NOT NULL,
    total INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX orders_customer ON orders(customer_id, created_at);
  CREATE INDEX orders_created ON orders(created_at);
  CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    name TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0)
  );
  CREATE INDEX order_items_order ON order_items(order_id);
  `,
];

export function migrate(db: SqlDb): void {
  db.run('PRAGMA foreign_keys = ON');
  let version = Number(db.all('PRAGMA user_version')[0]?.user_version ?? 0);
  for (; version < MIGRATIONS.length; version++) {
    db.run('BEGIN');
    try {
      db.run(MIGRATIONS[version]);
      db.run(`PRAGMA user_version = ${version + 1}`);
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
  }
}
