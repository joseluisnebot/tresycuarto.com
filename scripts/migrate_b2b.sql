-- B2B Dashboard: autenticación de propietarios de locales
CREATE TABLE IF NOT EXISTS locales_auth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  session_token TEXT,
  session_expires TEXT,
  slug TEXT UNIQUE,
  plan TEXT DEFAULT 'free',
  trial_inicio TEXT DEFAULT (datetime('now')),
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Columnas extra en locales para el perfil B2B
ALTER TABLE locales ADD COLUMN descripcion TEXT;
ALTER TABLE locales ADD COLUMN foto_perfil TEXT;
ALTER TABLE locales ADD COLUMN fotos TEXT;
ALTER TABLE locales ADD COLUMN claimed INTEGER DEFAULT 0;
ALTER TABLE locales ADD COLUMN slug TEXT;
