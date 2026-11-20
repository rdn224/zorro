import { useEffect, useMemo, useState } from 'react';
import { dbReady } from './db/client';
import Search from './screens/Search';
import CustomerScreen from './screens/Customer';
import CustomerForm from './screens/CustomerForm';
import OrderForm from './screens/OrderForm';
import ReportScreen from './screens/Report';
import MenuScreen from './screens/Menu';

export type Route =
  | { name: 'search' }
  | { name: 'report' }
  | { name: 'menu' }
  | { name: 'customer'; id: number }
  | { name: 'customerForm'; id?: number; phone?: string }
  | { name: 'order'; customerId: number; repeat?: boolean };

export interface Nav {
  push(route: Route): void;
  pop(): void;
  replace(route: Route): void;
}

const TABS: { route: Route; label: string; icon: string }[] = [
  { route: { name: 'search' }, label: 'Хайх', icon: '🔍' },
  { route: { name: 'report' }, label: 'Тайлан', icon: '📊' },
  { route: { name: 'menu' }, label: 'Цэс', icon: '🍕' },
];

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ name: 'search' }]);
  const [query, setQuery] = useState('');
  const [db, setDb] = useState<'loading' | 'ready' | string>('loading');

  useEffect(() => {
    dbReady.then(
      () => setDb('ready'),
      (e) => setDb(e instanceof Error ? e.message : String(e)),
    );
    // Ask iOS not to evict the stored data.
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  const nav = useMemo<Nav>(
    () => ({
      push: (r) => setStack((s) => [...s, r]),
      pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
    }),
    [],
  );

  if (db === 'loading') return <div className="splash">Ачаалж байна…</div>;
  if (db !== 'ready') {
    return (
      <div className="splash">
        <div className="error-box">
          <b>Өгөгдлийн санг нээж чадсангүй.</b>
          <p>
            Апп өөр цонхонд давхар нээлттэй байж магадгүй. Бусад цонхыг хаагаад дахин нээнэ үү.
          </p>
          <small>{db}</small>
          <button className="btn primary" onClick={() => location.reload()}>
            Дахин оролдох
          </button>
        </div>
      </div>
    );
  }

  const route = stack[stack.length - 1];
  const isTab = stack.length === 1;

  return (
    <div className={isTab ? 'app with-tabs' : 'app'}>
      {route.name === 'search' && <Search nav={nav} query={query} setQuery={setQuery} />}
      {route.name === 'report' && <ReportScreen nav={nav} />}
      {route.name === 'menu' && <MenuScreen />}
      {route.name === 'customer' && <CustomerScreen nav={nav} id={route.id} />}
      {route.name === 'customerForm' && <CustomerForm nav={nav} id={route.id} phone={route.phone} />}
      {route.name === 'order' && (
        <OrderForm nav={nav} customerId={route.customerId} repeat={route.repeat} />
      )}

      {isTab && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button
              key={t.route.name}
              className={route.name === t.route.name ? 'tab active' : 'tab'}
              onClick={() => setStack([t.route])}
            >
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
