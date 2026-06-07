// All habit dates are stored as local-time ISO "YYYY-MM-DD" strings.
// We deliberately avoid UTC conversion so a check-in on the night of June 7
// is always "2026-06-07", regardless of timezone.

export function toISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const r = d instanceof Date ? new Date(d) : fromISODate(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function diffDays(a, b) {
  const ms = fromISODate(a).getTime() - fromISODate(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function today() {
  return toISODate(new Date());
}

// Returns 0..6 with 0 = `weekStartsOn`
export function weekdayIndex(isoDate, weekStartsOn = 1) {
  const jsDay = fromISODate(isoDate).getDay(); // 0=Sun..6=Sat
  return (jsDay - weekStartsOn + 7) % 7;
}

// Returns the ISO date of the first day of the week containing `isoDate`.
// Used as a stable week key.
export function weekKey(isoDate, weekStartsOn = 1) {
  const idx = weekdayIndex(isoDate, weekStartsOn);
  return toISODate(addDays(isoDate, -idx));
}

export function lastNDays(n, end = today()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(toISODate(addDays(end, -i)));
  }
  return out;
}

export function shortWeekday(jsDay) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][jsDay];
}

export function formatHumanDate(isoDate) {
  return fromISODate(isoDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
