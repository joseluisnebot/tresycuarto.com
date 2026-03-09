CREATE TABLE IF NOT EXISTS locales (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT,
  ciudad TEXT NOT NULL,
  lat REAL,
  lon REAL,
  direccion TEXT,
  codigo_postal TEXT,
  telefono TEXT,
  web TEXT,
  instagram TEXT,
  horario TEXT,
  terraza INTEGER DEFAULT 0,
  musica TEXT,
  fuente TEXT DEFAULT 'openstreetmap',
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_locales_ciudad ON locales(ciudad);
CREATE INDEX IF NOT EXISTS idx_locales_tipo ON locales(tipo);
CREATE INDEX IF NOT EXISTS idx_locales_terraza ON locales(terraza);
