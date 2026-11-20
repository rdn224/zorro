import type { Nav } from '../App';
import Header from '../components/Header';
import OrderCard from '../components/OrderCard';
import { api } from '../db/client';
import { money } from '../lib/format';
import { errorText, useQuery } from '../lib/hooks';
import { formatPhone } from '../lib/phone';

export default function CustomerScreen(props: { nav: Nav; id: number }) {
  const { nav, id } = props;
  const { data, error, reload } = useQuery(
    async () => ({ customer: await api.getCustomer(id), orders: await api.listOrders(id) }),
    [id],
  );

  if (error) return <p className="error">{error}</p>;
  if (!data) return null;
  const { customer, orders } = data;
  if (!customer) return <Header title="Олдсонгүй" onBack={nav.pop} />;

  const remove = async (orderId: number) => {
    if (!confirm('Энэ захиалгыг устгах уу?')) return;
    try {
      await api.deleteOrder(orderId);
      reload();
    } catch (e) {
      alert(errorText(e));
    }
  };

  return (
    <>
      <Header
        title="Хэрэглэгч"
        onBack={nav.pop}
        action={
          <button className="header-btn" onClick={() => nav.push({ name: 'customerForm', id })}>
            Засах
          </button>
        }
      />
      <main className="screen">
        <div className="card profile">
          <div className="name">{customer.name || 'Нэргүй'}</div>
          <a className="phone big" href={`tel:${customer.phone}`}>
            📞 {formatPhone(customer.phone)}
          </a>
          {customer.phone2 && (
            <a className="phone" href={`tel:${customer.phone2}`}>
              📞 {formatPhone(customer.phone2)}
            </a>
          )}
          <div className="field">
            <span className="label">Хаяг</span>
            <span className="address">{customer.address || '—'}</span>
          </div>
          {customer.note && (
            <div className="field">
              <span className="label">Тэмдэглэл</span>
              <span>{customer.note}</span>
            </div>
          )}
          <div className="stats">
            <div>
              <b>{customer.order_count}</b>
              <span>захиалга</span>
            </div>
            <div>
              <b>{money(customer.total_spent)}</b>
              <span>нийт дүн</span>
            </div>
          </div>
        </div>

        <div className="actions stack">
          <button
            className="btn primary"
            onClick={() => nav.push({ name: 'order', customerId: id })}
          >
            ＋ Шинэ захиалга
          </button>
          <button
            className="btn"
            disabled={orders.length === 0}
            onClick={() => nav.push({ name: 'order', customerId: id, repeat: true })}
          >
            ↻ Өмнөхийг давтах
          </button>
        </div>

        <h2 className="section">Захиалгын түүх</h2>
        {orders.length === 0 && <p className="empty">Захиалга хийгээгүй байна.</p>}
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} onDelete={() => remove(o.id)} />
        ))}
      </main>
    </>
  );
}
