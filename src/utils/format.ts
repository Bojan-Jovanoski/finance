export function formatMKD(amount: number): string {
  return Math.round(amount).toLocaleString('de-DE') + ' ден';
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

// Compact month label for charts / dense lists, e.g. "Jul" or "Jul '25".
export function formatMonthShort(month: string, withYear = false): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    ...(withYear ? { year: '2-digit' } : {}),
  });
}

// The last `count` months up to and including `upTo` (default current month),
// ordered oldest → newest. Handy for range queries and trend charts.
export function recentMonths(count: number, upTo: string = currentMonth()): string[] {
  const months: string[] = [];
  let m = upTo;
  for (let i = 0; i < count; i++) {
    months.unshift(m);
    m = prevMonth(m);
  }
  return months;
}

export function prevMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isCurrentMonth(month: string): boolean {
  return month === currentMonth();
}

// Number of calendar days in a "YYYY-MM" month.
export function daysInMonth(month: string): number {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m, 0).getDate();
}

// Today's day-of-month (1–31). Used to project month-end spending pace.
export function currentDayOfMonth(): number {
  return new Date().getDate();
}

// First and last calendar day of a "YYYY-MM" month, for date input min/max.
export function monthDateBounds(month: string): { min: string; max: string } {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return { min: `${month}-01`, max: `${month}-${String(lastDay).padStart(2, '0')}` };
}

export function defaultDateForMonth(month: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (today.startsWith(month)) return today;
  // For past/future months, default to first day
  return `${month}-01`;
}

export function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

// Human-friendly "added X ago" label for the history feed.
export function formatRelativeTime(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 45) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
