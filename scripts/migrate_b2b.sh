#!/bin/bash
set -e

echo "Creando tabla locales_auth..."
wrangler d1 execute tresycuarto-db --remote --command="CREATE TABLE IF NOT EXISTS locales_auth (id INTEGER PRIMARY KEY AUTOINCREMENT, local_id TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, session_token TEXT, session_expires TEXT, slug TEXT UNIQUE, plan TEXT DEFAULT 'free', trial_inicio TEXT DEFAULT (datetime('now')), verified INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))"

echo "Añadiendo columnas a locales..."
wrangler d1 execute tresycuarto-db --remote --command="ALTER TABLE locales ADD COLUMN descripcion TEXT" || echo "descripcion ya existe"
wrangler d1 execute tresycuarto-db --remote --command="ALTER TABLE locales ADD COLUMN foto_perfil TEXT" || echo "foto_perfil ya existe"
wrangler d1 execute tresycuarto-db --remote --command="ALTER TABLE locales ADD COLUMN fotos TEXT" || echo "fotos ya existe"
wrangler d1 execute tresycuarto-db --remote --command="ALTER TABLE locales ADD COLUMN claimed INTEGER DEFAULT 0" || echo "claimed ya existe"
wrangler d1 execute tresycuarto-db --remote --command="ALTER TABLE locales ADD COLUMN slug TEXT" || echo "slug ya existe"

echo "Migracion B2B completada."
