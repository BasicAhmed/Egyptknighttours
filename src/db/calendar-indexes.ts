// The one index the calendar needs on a date that lives inside a JSON text column: the payment deadline written on an
// invoice. SQLite keeps an index on an expression up to date by itself, so no code that saves an invoice had to change and
// nothing is copied or backfilled. The expression is guarded with json_valid, so a row whose text is not JSON is simply
// left out instead of stopping a save. The query in src/lib/calendar.ts uses this exact expression (that is what lets
// SQLite pick the index). The statement can be run again and again; a database that cannot build it still works, only
// slower (see bootstrap).
export const INVOICE_DEADLINE = "(CASE WHEN json_valid(data) THEN json_extract(data, '$.deadline') END)";
export const CALENDAR_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS documents_cal_deadline_idx ON documents (${INVOICE_DEADLINE}) WHERE kind = 'INVOICE'`,
];
