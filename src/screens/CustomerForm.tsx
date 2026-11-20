import { useEffect, useState, type FormEvent } from 'react';
import type { Nav } from '../App';
import Header from '../components/Header';
import { api } from '../db/client';
import { errorText } from '../lib/hooks';

export default function CustomerForm(props: { nav: Nav; id?: number; phone?: string }) {
  const { nav, id } = props;
  const [form, setForm] = useState({
    phone: props.phone ?? '',
    phone2: '',
    name: '',
    address: '',
    note: '',
  });
  const [loaded, setLoaded] = useState(!id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getCustomer(id).then((c) => {
      if (c) setForm({ phone: c.phone, phone2: c.phone2, name: c.name, address: c.address, note: c.note });
      setLoaded(true);
    }, (e) => setError(errorText(e)));
  }, [id]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const savedId = await api.saveCustomer({ id, ...form });
      if (id) nav.pop();
      else nav.replace({ name: 'customer', id: savedId });
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <>
      <Header title={id ? 'Хэрэглэгч засах' : 'Шинэ хэрэглэгч'} onBack={nav.pop} />
      {loaded && (
        <form className="screen form" onSubmit={submit}>
          <label>
            Утасны дугаар
            <input type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} required />
          </label>
          <label>
            Нэр
            <input value={form.name} onChange={set('name')} autoFocus={!id} />
          </label>
          <label>
            Гэрийн хаяг
            <textarea
              rows={3}
              value={form.address}
              onChange={set('address')}
              placeholder="Дүүрэг, хороо, байр, тоот"
            />
          </label>
          <label>
            Нэмэлт утас
            <input type="tel" inputMode="numeric" value={form.phone2} onChange={set('phone2')} />
          </label>
          <label>
            Тэмдэглэл
            <textarea
              rows={2}
              value={form.note}
              onChange={set('note')}
              placeholder="Орцны код, давхар гэх мэт"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" disabled={saving}>
            Хадгалах
          </button>
        </form>
      )}
    </>
  );
}
