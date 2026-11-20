export type SqlValue = string | number | null;
export type Row = Record<string, any>;

/** Minimal synchronous database interface the repository is written against. */
export interface SqlDb {
  all(sql: string, bind?: SqlValue[]): Row[];
  run(sql: string, bind?: SqlValue[]): void;
}

export type Category = 'pizza' | 'drink';

export interface Customer {
  id: number;
  phone: string;
  phone2: string;
  name: string;
  address: string;
  note: string;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
}

export interface CustomerInput {
  id?: number;
  phone: string;
  phone2?: string;
  name?: string;
  address?: string;
  note?: string;
}

export interface Product {
  id: number;
  name: string;
  category: Category;
  price: number;
  active: number;
}

export interface ProductInput {
  id?: number;
  name: string;
  category: Category;
  price: number;
  active?: boolean;
}

export interface OrderItem {
  product_id: number | null;
  name: string;
  unit_price: number;
  qty: number;
}

export interface Order {
  id: number;
  customer_id: number;
  created_at: string;
  total: number;
  note: string;
  items: OrderItem[];
}

export interface OrderInput {
  customerId: number;
  items: { productId: number; qty: number }[];
  note?: string;
  /** ISO timestamp; defaults to now. */
  createdAt?: string;
}

export interface ReportOrder extends Order {
  customer_name: string;
  customer_phone: string;
}

export interface Report {
  count: number;
  total: number;
  top: { name: string; qty: number; total: number }[];
  orders: ReportOrder[];
}
