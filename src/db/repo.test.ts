import { beforeEach, describe, expect, it } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import * as repo from './repo';
import { migrate } from './schema';
import type { SqlDb } from './types';

let db: SqlDb;

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  const raw = new sqlite3.oo1.DB(':memory:');
  db = {
    all: (sql, bind) => raw.selectObjects(sql, bind),
    run: (sql, bind) => {
      raw.exec({ sql, bind });
    },
  };
  migrate(db);
});

describe('customers', () => {
  it('finds a customer by part of the phone number, ignoring formatting', () => {
    const id = repo.saveCustomer(db, { phone: '+976 9911-2233', name: 'Бат', address: 'БЗД 5-р хороо' });
    repo.saveCustomer(db, { phone: '88001122', name: 'Сараа' });

    expect(repo.searchCustomers(db, '9911').map((c) => c.id)).toEqual([id]);
    expect(repo.searchCustomers(db, '99 11 22 33')[0].name).toBe('Бат');
    expect(repo.searchCustomers(db, '7777')).toEqual([]);
    expect(repo.searchCustomers(db, '')).toHaveLength(2);
    expect(repo.getCustomer(db, id)?.phone).toBe('99112233');
  });

  it('rejects duplicate and invalid phone numbers', () => {
    const id = repo.saveCustomer(db, { phone: '99112233' });
    expect(() => repo.saveCustomer(db, { phone: '9911 2233' })).toThrow('PHONE_EXISTS');
    expect(() => repo.saveCustomer(db, { phone: '123' })).toThrow('PHONE_INVALID');
    // Updating the same customer keeps its own number.
    expect(repo.saveCustomer(db, { id, phone: '99112233', address: 'Шинэ хаяг' })).toBe(id);
    expect(repo.getCustomer(db, id)?.address).toBe('Шинэ хаяг');
  });
});

describe('orders', () => {
  it('stores history with totals and keeps old prices after a menu change', () => {
    const customerId = repo.saveCustomer(db, { phone: '99112233' });
    const pizza = repo.saveProduct(db, { name: 'Пепперони', category: 'pizza', price: 25000 });
    const cola = repo.saveProduct(db, { name: 'Кола', category: 'drink', price: 3000 });

    repo.createOrder(db, {
      customerId,
      items: [{ productId: pizza, qty: 2 }, { productId: cola, qty: 1 }, { productId: cola, qty: 0 }],
      createdAt: '2026-11-01T10:00:00.000Z',
    });
    repo.saveProduct(db, { id: pizza, name: 'Пепперони', category: 'pizza', price: 30000 });
    repo.createOrder(db, {
      customerId,
      items: [{ productId: pizza, qty: 1 }],
      createdAt: '2026-11-02T10:00:00.000Z',
    });

    const orders = repo.listOrders(db, customerId);
    expect(orders.map((o) => o.total)).toEqual([30000, 53000]);
    expect(orders[1].items).toEqual([
      { product_id: pizza, name: 'Пепперони', unit_price: 25000, qty: 2 },
      { product_id: cola, name: 'Кола', unit_price: 3000, qty: 1 },
    ]);

    const customer = repo.getCustomer(db, customerId)!;
    expect(customer.order_count).toBe(2);
    expect(customer.total_spent).toBe(83000);
    expect(customer.last_order_at).toBe('2026-11-02T10:00:00.000Z');

    repo.deleteOrder(db, orders[0].id);
    expect(repo.listOrders(db, customerId)).toHaveLength(1);
    expect(db.all('SELECT COUNT(*) AS n FROM order_items')[0].n).toBe(2);
  });

  it('refuses an empty order', () => {
    const customerId = repo.saveCustomer(db, { phone: '99112233' });
    expect(() => repo.createOrder(db, { customerId, items: [] })).toThrow('ORDER_EMPTY');
  });
});

describe('menu and report', () => {
  it('hides inactive products from the order menu', () => {
    const id = repo.saveProduct(db, { name: 'Хавай', category: 'pizza', price: 22000 });
    repo.saveProduct(db, { id, name: 'Хавай', category: 'pizza', price: 22000, active: false });
    expect(repo.listProducts(db)).toEqual([]);
    expect(repo.listProducts(db, true)).toHaveLength(1);
  });

  it('sums only the orders inside the period', () => {
    const customerId = repo.saveCustomer(db, { phone: '99112233', name: 'Бат' });
    const pizza = repo.saveProduct(db, { name: 'Пепперони', category: 'pizza', price: 25000 });
    const cola = repo.saveProduct(db, { name: 'Кола', category: 'drink', price: 3000 });
    const order = (createdAt: string, qty: number) =>
      repo.createOrder(db, {
        customerId,
        createdAt,
        items: [{ productId: pizza, qty }, { productId: cola, qty: 1 }],
      });
    order('2026-11-19T23:59:59.000Z', 5);
    order('2026-11-20T00:00:00.000Z', 1);
    order('2026-11-20T12:00:00.000Z', 2);
    order('2026-11-21T00:00:00.000Z', 5);

    const r = repo.report(db, '2026-11-20T00:00:00.000Z', '2026-11-21T00:00:00.000Z');
    expect(r.count).toBe(2);
    expect(r.total).toBe(3 * 25000 + 2 * 3000);
    expect(r.top).toEqual([
      { name: 'Пепперони', qty: 3, total: 75000 },
      { name: 'Кола', qty: 2, total: 6000 },
    ]);
    expect(r.orders).toHaveLength(2);
    expect(r.orders[0].customer_name).toBe('Бат');
    expect(r.orders[0].items).toHaveLength(2);
  });
});
