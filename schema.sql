-- Partbase D1 schema. Apply with: npx wrangler d1 execute partbase --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS docs (
  col     TEXT NOT NULL,      -- collection path, e.g. "open", "qlog", "data/users/<uid>"
  id      TEXT NOT NULL,
  data    TEXT NOT NULL,      -- JSON document
  updated INTEGER NOT NULL,
  PRIMARY KEY (col, id)
);
CREATE INDEX IF NOT EXISTS docs_col_updated ON docs(col, updated);

CREATE TABLE IF NOT EXISTS usage (  -- chat calls per browser per hour (abuse limit)
  uid  TEXT NOT NULL,
  hour INTEGER NOT NULL,
  n    INTEGER NOT NULL,
  PRIMARY KEY (uid, hour)
);
