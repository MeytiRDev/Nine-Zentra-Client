const fa = (n: number): string => n.toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

/** امروز: ساعت؛ قبل‌تر: تاریخ کوتاه */
export function formatListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return formatTime(iso);
  return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
}

/** میلی‌ثانیه → «۰۱:۲۵» */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${fa(Math.floor(total / 60))}:${fa(total % 60)}`;
}
