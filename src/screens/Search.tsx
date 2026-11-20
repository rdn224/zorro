import type { Nav } from '../App';
import { api } from '../db/client';
import { dateTime } from '../lib/format';
import { useQuery } from '../lib/hooks';
import { formatPhone, isValidPhone, normalizePhone } from '../lib/phone';

export default function Search(props: { nav: Nav; query: string; setQuery: (q: string) => void }) {
  const { nav, query, setQuery } = props;
  const digits = normalizePhone(query);
  const { data: customers, error } = useQuery(() => api.searchCustomers(digits), [digits]);

  const paste = async () => {
    try {
      setQuery(normalizePhone(await navigator.clipboard.readText()));
    } catch {
      // Clipboard access denied — the user can still type the number.
    }
  };

  const exact = customers?.some((c) => c.phone === digits || c.phone2 === digits);
  const canCreate = isValidPhone(digits) && customers !== undefined && !exact;

  return (
    <main className="screen">
      <div className="search-box">
        <input
          className="search-input"
          type="search"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Утасны дугаар"
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/[^\d+\s-]/g, ''))}
          autoFocus
        />
        {query ? (
          <button className="btn" onClick={() => setQuery('')}>
            Арилгах
          </button>
        ) : (
          <button className="btn" onClick={paste}>
            Буулгах
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {canCreate && (
        <button
          className="btn primary block"
          onClick={() => nav.push({ name: 'customerForm', phone: digits })}
        >
          ＋ Шинэ хэрэглэгч: {formatPhone(digits)}
        </button>
      )}

      {customers && (
        <>
          <h2 className="section">
            {digits ? `Илэрц (${customers.length})` : 'Сүүлийн хэрэглэгчид'}
          </h2>
          {customers.length === 0 && (
            <p className="empty">
              {digits
                ? 'Ийм дугаартай хэрэглэгч олдсонгүй.'
                : 'Одоогоор хэрэглэгч бүртгэгдээгүй байна. Дээр дугаараа бичээд эхний хэрэглэгчээ бүртгээрэй.'}
            </p>
          )}
          {customers.map((c) => (
            <button
              key={c.id}
              className="card customer-row"
              onClick={() => nav.push({ name: 'customer', id: c.id })}
            >
              <div className="row">
                <b className="phone">{formatPhone(c.phone)}</b>
                <span className="badge">{c.order_count} захиалга</span>
              </div>
              <div>{c.name || 'Нэргүй'}</div>
              {c.address && <div className="muted clamp">{c.address}</div>}
              {c.last_order_at && (
                <div className="muted small">Сүүлд: {dateTime(c.last_order_at)}</div>
              )}
            </button>
          ))}
        </>
      )}
    </main>
  );
}
