// Tiny CSV helpers — RFC 4180 escaping.
// Any value containing a comma, quote, or newline is wrapped in double-quotes
// with internal quotes doubled.

export function escapeCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV(rows) {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}
