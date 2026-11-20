export function money(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')}₮`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "Өнөөдөр 14:05", "Өчигдөр 19:30" or "2026.11.03 18:20" in the phone's local time. */
export function dateTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const days = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);
  if (days === 0) return `Өнөөдөр ${time}`;
  if (days === 1) return `Өчигдөр ${time}`;
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${time}`;
}

/** [from, to) ISO range for today or the current month, in local time. */
export function periodRange(period: 'day' | 'month', now = new Date()): { from: string; to: string } {
  const from =
    period === 'day' ? startOfDay(now) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to =
    period === 'day'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}
