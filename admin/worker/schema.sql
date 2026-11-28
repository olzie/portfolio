-- itsolga.com visit stats and leads. Run once in the D1 console (or: wrangler d1 execute itsolga --file schema.sql).
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,            -- unix seconds
  visit TEXT NOT NULL,            -- one page load; made in the browser's memory, never stored there
  type TEXT NOT NULL,             -- view | reach | dwell | depth | click | case
  name TEXT,
  value REAL,
  lang TEXT, country TEXT, device TEXT, ref TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT
);
CREATE INDEX IF NOT EXISTS events_ts ON events (ts);
CREATE INDEX IF NOT EXISTS events_type_ts ON events (type, ts);
CREATE INDEX IF NOT EXISTS events_visit ON events (visit);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  visit TEXT,
  need TEXT, market TEXT, start TEXT, message TEXT,
  lang TEXT, country TEXT, device TEXT, ref TEXT, utm_source TEXT,
  status TEXT NOT NULL DEFAULT 'new',   -- new | talking | won | lost
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS leads_ts ON leads (ts);
