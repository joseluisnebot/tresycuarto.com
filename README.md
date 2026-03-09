# tresycuarto.com

Plataforma de tardeo y ocio de media tarde en España. Base de datos de usuarios y locales gestionada por agentes IA.

## Stack

- **Frontend:** Next.js 15.5 + Tailwind + TypeScript (`output: export` — HTML estático)
- **Hosting:** Cloudflare Pages
- **API:** Cloudflare Pages Functions (`/functions/`)
- **Base de datos:** Cloudflare D1 (`tresycuarto-db`)
- **Almacenamiento:** Cloudflare R2 (`tresycuarto-media`)

> Las API routes de Next.js **no funcionan** con static export. Toda la lógica de servidor va en `/functions/` como Cloudflare Pages Functions.

## Estructura

```
app/                    # Páginas Next.js
  page.tsx              # Landing principal
  dashboard/            # Dashboard usuario
  local/                # Área de locales (login, registro, dashboard)
  para-locales/         # Landing B2B
  unete/                # Formulario alta usuarios
  contacto/
  faq/
  privacidad/

functions/              # Cloudflare Pages Functions (API serverless)
  api/
    local/              # Auth, perfil, fotos, menú, eventos, stats de locales
    locales/            # Listado público de locales
    solicitud/          # Alta de nuevos locales
    admin/              # Panel administración
    subscribe/          # Suscripción email
    stripe/             # Webhook pagos
  l/[slug].js           # Redirección slugs de locales
  locales/[id].js       # Ficha pública de local
  sitemap*.js           # Sitemaps dinámicos por ciudad

scripts/                # Agentes y utilidades
  overpass_scraper.py   # Extrae locales de OpenStreetMap (Overpass API)
  enriquecedor.py       # Enriquece datos de locales via Instagram/web
  enriquecedor_loop.sh  # Ejecuta el enriquecedor en bucle continuo
  geocoder.py           # Geocodificación de direcciones
  generar_sql.py        # Genera SQL de inserción desde JSON
  importar_d1.py        # Importa datos a Cloudflare D1
  schema.sql            # Esquema completo de la base de datos
  migrate_*.sql         # Migraciones

data/                   # Datos de locales por ciudad (JSON)
  madrid.json, barcelona.json, valencia.json, sevilla.json
  bilbao.json, malaga.json, murcia.json, zaragoza.json
```

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # genera /out (estático)
```

## Deploy a Cloudflare Pages

El deploy se hace desde la VM `tresycuarto-dev` (192.168.1.150) donde están los `node_modules`.

```bash
ssh -i ~/.ssh/tresycuarto_vm ubuntu@192.168.1.150
cd ~/tresycuarto
npm run build
export CLOUDFLARE_API_TOKEN=<token>
export CLOUDFLARE_ACCOUNT_ID=0c4d9c91bb0f3a4c905545ecc158ec65
npx wrangler pages deploy out --project-name=tresycuarto --branch=main
```

## Base de datos D1

**ID:** `458672aa-392f-4767-8d2b-926406628ba0`

```bash
# Aplicar esquema inicial
npx wrangler d1 execute tresycuarto-db --file=scripts/schema.sql

# Importar locales de una ciudad
python3 scripts/importar_d1.py --ciudad madrid

# Consulta directa
npx wrangler d1 execute tresycuarto-db --command="SELECT COUNT(*) FROM locales"
```

## Agentes IA

### Scraper OSM
Extrae locales de bares, restaurantes y ocio de OpenStreetMap:
```bash
python3 scripts/overpass_scraper.py --ciudad madrid --radio 15000
```

### Enriquecedor
Completa datos de cada local (Instagram, web, fotos):
```bash
python3 scripts/enriquecedor.py
bash scripts/enriquecedor_loop.sh  # bucle continuo
```

## URLs

| Entorno | URL |
|---------|-----|
| Producción | https://tresycuarto.com |
| Pages (backup) | https://tresycuarto.pages.dev |
| Listmonk (email marketing) | https://listmonk.tresycuarto.com |

## Diseño

| Color | Hex |
|-------|-----|
| Crema (fondo) | `#FFF8EF` |
| Melocotón (acento) | `#FB923C` |
| Dorado | `#F59E0B` |
| Lavanda | `#A78BFA` |
