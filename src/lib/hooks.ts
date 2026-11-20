import { useCallback, useEffect, useState } from 'react';

const MESSAGES: Record<string, string> = {
  PHONE_INVALID: 'Утасны дугаар буруу байна (дор хаяж 6 оронтой).',
  PHONE_EXISTS: 'Энэ дугаартай хэрэглэгч аль хэдийн бүртгэлтэй байна.',
  NAME_REQUIRED: 'Нэрээ оруулна уу.',
  PRICE_INVALID: 'Үнэ буруу байна.',
  ORDER_EMPTY: 'Захиалгад бараа сонгоогүй байна.',
  PRODUCT_NOT_FOUND: 'Бараа олдсонгүй.',
};

export function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return MESSAGES[msg] ?? `Алдаа гарлаа: ${msg}`;
}

/** Loads data on mount and whenever deps change; `reload` re-runs the query. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stale = false;
    fn().then(
      (d) => {
        if (!stale) {
          setData(d);
          setError(null);
        }
      },
      (e) => !stale && setError(errorText(e)),
    );
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
