-- Migración auth v2: tabla usuarios + usuario_locales
-- Ejecutar: wrangler d1 execute tresycuarto-db --remote --file=scripts/migrate_auth_v2.sql

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  session_token TEXT,
  session_expires TEXT,
  verify_token TEXT,
  reset_token TEXT,
  reset_expires TEXT,
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuario_locales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  local_id TEXT NOT NULL,
  slug TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'trial',
  trial_inicio TEXT,
  plan_expires TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Migrar usuarios desde locales_auth (preservar IDs)
INSERT INTO usuarios (id, email, password_hash, salt, session_token, session_expires, verify_token, reset_token, reset_expires, verified, created_at)
SELECT id, email, password_hash, salt, session_token, session_expires, verify_token, reset_token, reset_expires, verified, created_at
FROM locales_auth;

-- Migrar relaciones usuario-local
INSERT INTO usuario_locales (usuario_id, local_id, slug, stripe_customer_id, stripe_subscription_id, plan, trial_inicio, plan_expires, created_at)
SELECT id, local_id, slug, stripe_customer_id, stripe_subscription_id, COALESCE(plan, 'trial'), trial_inicio, plan_expires, created_at
FROM locales_auth;
