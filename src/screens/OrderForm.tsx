import { useEffect, useState } from 'react';
import type { Nav } from '../App';
import Header from '../components/Header';
import { api } from '../db/client';
import type { Customer, Product } from '../db/types';
import { money } from '../lib/format';
import { errorText } from '../lib/hooks';
import { formatPhone } from '../lib/phone';

export default function OrderForm(props: { nav: Nav; customerId: number; repeat?: boolean }) {
  const { nav, customerId, repeat } = props;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, list] = await Promise.all([api.getCustomer(customerId), api.listProducts()]);
      setCustomer(c);
      setProducts(list);
      if (repeat) {
        // Pre-fill with the previous order; items no longer on the menu are listed as a warning.
        const last = (await api.listOrders(customerId))[0];
        const available = new Set(list.map((p) => p.id));
        const initial: Record<number, number> = {};
        const gone: string[] = [];
        for (const item of last?.items ?? []) {
          if (item.product_id !== null && available.has(item.product_id)) {
            initial[item.product_id] = (initial[item.product_id] ?? 0) + item.qty;
          } else gone.push(item.name);
        }
        setQty(initial);
        setMissing(gone);
      }
    })().catch((e) => setError(errorText(e)));
  }, [customerId, repeat]);

  if (!products) return <Header title="Шинэ захиалга" onBack={nav.pop} />;

  const change = (id: number, delta: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));
  const total = products.reduce((sum, p) => sum + p.price * (qty[p.id] ?? 0), 0);
  const count = products.reduce((sum, p) => sum + (qty[p.id] ?? 0), 0);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.createOrder({
        customerId,
        note,
        items: products.map((p) => ({ productId: p.id, qty: qty[p.id] ?? 0 })),
      });
      nav.pop();
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  };

  const group = (category: Product['category'], title: string) => {
    const list = products.filter((p) => p.category === category);
    if (!list.length) return null;
    return (
      <>
        <h2 className="section">{title}</h2>
        {list.map((p) => {
          const n = qty[p.id] ?? 0;
          return (
            <div key={p.id} className={n ? 'card product selected' : 'card product'}>
              <div className="product-info">
                <b>{p.name}</b>
                <span className="muted">{money(p.price)}</span>
              </div>
              <div className="stepper">
                <button onClick={() => change(p.id, -1)} disabled={!n} aria-label="Хасах">
                  −
                </button>
                <span>{n}</span>
                <button onClick={() => change(p.id, 1)} aria-label="Нэмэх">
                  ＋
                </button>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <>
      <Header title={repeat ? 'Давтан захиалга' : 'Шинэ захиалга'} onBack={nav.pop} />
      <main className="screen with-footer">
        {customer && (
          <div className="card delivery">
            <b>
              {customer.name || 'Нэргүй'} · {formatPhone(customer.phone)}
            </b>
            <span className="muted">{customer.address || 'Хаяг бүртгээгүй'}</span>
          </div>
        )}
        {missing.length > 0 && (
          <p className="error">Цэсэнд байхгүй болсон тул ороогүй: {missing.join(', ')}</p>
        )}
        {products.length === 0 && (
          <p className="empty">Цэс хоосон байна. Эхлээд «Цэс» табаас пицца, ундаагаа бүртгээрэй.</p>
        )}
        {group('pizza', 'Пицца')}
        {group('drink', 'Ундаа')}
        {products.length > 0 && (
          <label className="form">
            Тэмдэглэл
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Жишээ: сонгиногүй, 19:00 цагт"
            />
          </label>
        )}
        {error && <p className="error">{error}</p>}
      </main>
      <footer className="footer">
        <div>
          <span className="muted">{count} ширхэг</span>
          <b className="total">{money(total)}</b>
        </div>
        <button className="btn primary" disabled={!count || saving} onClick={save}>
          Хадгалах
        </button>
      </footer>
    </>
  );
}
