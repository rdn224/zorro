import { useState, type FormEvent } from 'react';
import { api } from '../db/client';
import type { Category, Product } from '../db/types';
import { money } from '../lib/format';
import { errorText, useQuery } from '../lib/hooks';

type Draft = { id?: number; name: string; category: Category; price: string; active: boolean };

const EMPTY: Draft = { name: '', category: 'pizza', price: '', active: true };

export default function MenuScreen() {
  const { data: products, error: loadError, reload } = useQuery(() => api.listProducts(true), []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const edit = (p: Product) =>
    setDraft({ id: p.id, name: p.name, category: p.category, price: String(p.price), active: !!p.active });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    try {
      await api.saveProduct({ ...draft, price: Number(draft.price) });
      setDraft(null);
      setError(null);
      reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const group = (category: Category, title: string) => (
    <>
      <div className="row section-row">
        <h2 className="section">{title}</h2>
        <button className="link" onClick={() => setDraft({ ...EMPTY, category })}>
          ＋ Нэмэх
        </button>
      </div>
      {products?.filter((p) => p.category === category).length === 0 && (
        <p className="empty">Бүртгэл алга.</p>
      )}
      {products
        ?.filter((p) => p.category === category)
        .map((p) => (
          <button
            key={p.id}
            className={p.active ? 'card product' : 'card product inactive'}
            onClick={() => edit(p)}
          >
            <b>{p.name}</b>
            <span className="muted">{p.active ? money(p.price) : 'Идэвхгүй'}</span>
          </button>
        ))}
    </>
  );

  return (
    <main className="screen">
      {loadError && <p className="error">{loadError}</p>}
      {group('pizza', 'Пицца')}
      {group('drink', 'Ундаа')}

      {draft && (
        <div className="sheet-backdrop" onClick={() => setDraft(null)}>
          <form className="sheet form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2>{draft.id ? 'Бараа засах' : 'Шинэ бараа'}</h2>
            <div className="segmented">
              {(['pizza', 'drink'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={draft.category === c ? 'active' : ''}
                  onClick={() => setDraft({ ...draft, category: c })}
                >
                  {c === 'pizza' ? 'Пицца' : 'Ундаа'}
                </button>
              ))}
            </div>
            <label>
              Нэр
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={draft.category === 'pizza' ? 'Пепперони (жижиг)' : 'Кола 0.5л'}
                autoFocus
                required
              />
            </label>
            <label>
              Үнэ (₮)
              <input
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/\D/g, '') })}
                required
              />
            </label>
            {draft.id && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />
                Идэвхтэй (захиалгын цэсэнд харагдана)
              </label>
            )}
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button type="button" className="btn" onClick={() => setDraft(null)}>
                Болих
              </button>
              <button className="btn primary">Хадгалах</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
