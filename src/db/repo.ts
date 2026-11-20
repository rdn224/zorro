// All data access. Runs synchronously inside the database worker (and directly in tests).
import { isValidPhone, normalizePhone } from '../lib/phone';
import type {
  Customer, CustomerInput, Order, OrderInput, OrderItem, Product, ProductInput, Report,
  ReportOrder, SqlDb,
} from './types';

function transaction<T>(db: SqlDb, fn: () => T): T {
  db.run('BEGIN');
  try {
    const result = fn();
    db.run('COMMIT');
    return result;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

const lastId = (db: SqlDb) => Number(db.all('SELECT last_insert_rowid() AS id')[0].id);

const CUSTOMER_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count,
    (SELECT COALESCE(SUM(total), 0) FROM orders o WHERE o.customer_id = c.id) AS total_spent,
    (SELECT MAX(created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order_at
  FROM customers c`;

// ---------- customers ----------

/** Customers whose phone contains the typed digits; most recent customers when empty. */
export function searchCustomers(db: SqlDb, query: string): Customer[] {
  const q = normalizePhone(query);
  return db.all(
    `${CUSTOMER_SELECT}
     WHERE ?1 = '' OR c.phone LIKE '%' || ?1 || '%' OR c.phone2 LIKE '%' || ?1 || '%'
     ORDER BY (c.phone = ?1) DESC, (c.phone LIKE ?1 || '%') DESC,
              COALESCE(last_order_at, c.created_at) DESC
     LIMIT 30`,
    [q],
  ) as Customer[];
}

export function getCustomer(db: SqlDb, id: number): Customer | null {
  return (db.all(`${CUSTOMER_SELECT} WHERE c.id = ?`, [id])[0] as Customer) ?? null;
}

/** Creates or updates a customer. Throws PHONE_INVALID / PHONE_EXISTS. */
export function saveCustomer(db: SqlDb, input: CustomerInput): number {
  if (!isValidPhone(input.phone)) throw new Error('PHONE_INVALID');
  const phone = normalizePhone(input.phone);
  const phone2 = normalizePhone(input.phone2 ?? '');
  const taken = db.all('SELECT id FROM customers WHERE phone = ? AND id IS NOT ?', [
    phone,
    input.id ?? null,
  ]);
  if (taken.length) throw new Error('PHONE_EXISTS');

  const fields = [
    phone,
    phone2,
    (input.name ?? '').trim(),
    (input.address ?? '').trim(),
    (input.note ?? '').trim(),
  ];
  if (input.id) {
    db.run('UPDATE customers SET phone = ?, phone2 = ?, name = ?, address = ?, note = ? WHERE id = ?', [
      ...fields,
      input.id,
    ]);
    return input.id;
  }
  db.run(
    'INSERT INTO customers (phone, phone2, name, address, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [...fields, new Date().toISOString()],
  );
  return lastId(db);
}

// ---------- menu ----------

export function listProducts(db: SqlDb, includeInactive = false): Product[] {
  return db.all(
    `SELECT * FROM products WHERE active = 1 OR ?1 = 1
     ORDER BY category = 'drink', active DESC, id`,
    [includeInactive ? 1 : 0],
  ) as Product[];
}

export function saveProduct(db: SqlDb, input: ProductInput): number {
  const name = input.name.trim();
  const price = Math.round(Number(input.price));
  if (!name) throw new Error('NAME_REQUIRED');
  if (!Number.isFinite(price) || price < 0) throw new Error('PRICE_INVALID');
  const active = input.active === false ? 0 : 1;
  if (input.id) {
    db.run('UPDATE products SET name = ?, category = ?, price = ?, active = ? WHERE id = ?', [
      name, input.category, price, active, input.id,
    ]);
    return input.id;
  }
  db.run('INSERT INTO products (name, category, price, active) VALUES (?, ?, ?, ?)', [
    name, input.category, price, active,
  ]);
  return lastId(db);
}

// ---------- orders ----------

/** Saves an order, copying the current name and price of every item. */
export function createOrder(db: SqlDb, input: OrderInput): number {
  const items = input.items.filter((i) => i.qty > 0);
  if (!items.length) throw new Error('ORDER_EMPTY');
  return transaction(db, () => {
    const lines = items.map((i) => {
      const p = db.all('SELECT id, name, price FROM products WHERE id = ?', [i.productId])[0];
      if (!p) throw new Error('PRODUCT_NOT_FOUND');
      return { product_id: p.id, name: p.name, unit_price: p.price, qty: Math.round(i.qty) };
    });
    const total = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);
    db.run('INSERT INTO orders (customer_id, created_at, total, note) VALUES (?, ?, ?, ?)', [
      input.customerId,
      input.createdAt ?? new Date().toISOString(),
      total,
      (input.note ?? '').trim(),
    ]);
    const orderId = lastId(db);
    for (const l of lines) {
      db.run(
        'INSERT INTO order_items (order_id, product_id, name, unit_price, qty) VALUES (?, ?, ?, ?, ?)',
        [orderId, l.product_id, l.name, l.unit_price, l.qty],
      );
    }
    return orderId;
  });
}

export function deleteOrder(db: SqlDb, id: number): void {
  transaction(db, () => {
    db.run('DELETE FROM order_items WHERE order_id = ?', [id]);
    db.run('DELETE FROM orders WHERE id = ?', [id]);
  });
}

function withItems<T extends { id: number }>(db: SqlDb, orders: T[]): (T & { items: OrderItem[] })[] {
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const rows = db.all(
    `SELECT order_id, product_id, name, unit_price, qty FROM order_items
     WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
    ids,
  );
  const byOrder = new Map<number, OrderItem[]>();
  for (const { order_id, ...item } of rows) {
    if (!byOrder.has(order_id)) byOrder.set(order_id, []);
    byOrder.get(order_id)!.push(item as OrderItem);
  }
  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

/** A customer's orders, newest first. */
export function listOrders(db: SqlDb, customerId: number): Order[] {
  const orders = db.all(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC, id DESC',
    [customerId],
  ) as Omit<Order, 'items'>[];
  return withItems(db, orders);
}

// ---------- reports ----------

/** Sales between two ISO timestamps: [from, to). */
export function report(db: SqlDb, from: string, to: string): Report {
  const sum = db.all(
    'SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total FROM orders WHERE created_at >= ? AND created_at < ?',
    [from, to],
  )[0];
  const top = db.all(
    `SELECT i.name, SUM(i.qty) AS qty, SUM(i.qty * i.unit_price) AS total
     FROM order_items i JOIN orders o ON o.id = i.order_id
     WHERE o.created_at >= ? AND o.created_at < ?
     GROUP BY i.name ORDER BY qty DESC, total DESC LIMIT 10`,
    [from, to],
  ) as Report['top'];
  const orders = db.all(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.created_at >= ? AND o.created_at < ?
     ORDER BY o.created_at DESC, o.id DESC LIMIT 200`,
    [from, to],
  ) as Omit<ReportOrder, 'items'>[];
  return { count: Number(sum.count), total: Number(sum.total), top, orders: withItems(db, orders) };
}
