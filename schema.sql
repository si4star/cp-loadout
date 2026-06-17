-- schema.sql — apply once to the CP Loadout D1 database:
--   wrangler d1 execute cp-loadout-db --file=./schema.sql --remote
-- (use a NEW database, separate from Comic Stencils)

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT UNIQUE NOT NULL,   -- Stripe checkout session id
  payment_intent  TEXT,                   -- for refunds
  created_at      TEXT NOT NULL,          -- ISO timestamp
  customer_name   TEXT,
  customer_email  TEXT,
  ship_name       TEXT,
  ship_line1      TEXT,
  ship_line2      TEXT,
  ship_city       TEXT,
  ship_postcode   TEXT,
  ship_country    TEXT,
  items_json      TEXT,                   -- [{name, qty, amount}]
  shipping_method TEXT,                   -- e.g. "DPD — Next working day"
  amount_total    INTEGER,                -- pence
  currency        TEXT,
  status          TEXT DEFAULT 'paid',    -- paid | dispatched | refunded
  tracking        TEXT,                   -- DPD tracking number
  dispatched_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
