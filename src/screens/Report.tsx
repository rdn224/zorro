import { useState } from 'react';
import type { Nav } from '../App';
import OrderCard from '../components/OrderCard';
import { api } from '../db/client';
import { money, periodRange } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { formatPhone } from '../lib/phone';

export default function ReportScreen(props: { nav: Nav }) {
  const [period, setPeriod] = useState<'day' | 'month'>('day');
  const { data, error } = useQuery(() => {
    const { from, to } = periodRange(period);
    return api.report(from, to);
  }, [period]);

  return (
    <main className="screen">
      <div className="segmented">
        <button className={period === 'day' ? 'active' : ''} onClick={() => setPeriod('day')}>
          Өнөөдөр
        </button>
        <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>
          Энэ сар
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <div className="card stats">
            <div>
              <b>{data.count}</b>
              <span>захиалга</span>
            </div>
            <div>
              <b>{money(data.total)}</b>
              <span>борлуулалт</span>
            </div>
          </div>

          <h2 className="section">Их зарагдсан</h2>
          {data.top.length === 0 ? (
            <p className="empty">Энэ хугацаанд захиалга алга.</p>
          ) : (
            <div className="card">
              <ul className="items">
                {data.top.map((t) => (
                  <li key={t.name}>
                    <span>{t.name}</span>
                    <span className="qty">
                      ×{t.qty} · {money(t.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.orders.length > 0 && <h2 className="section">Захиалгууд</h2>}
          {data.orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              title={`${o.customer_name || 'Нэргүй'} · ${formatPhone(o.customer_phone)}`}
              onClick={() => props.nav.push({ name: 'customer', id: o.customer_id })}
            />
          ))}
        </>
      )}
    </main>
  );
}
