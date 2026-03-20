# tresycuarto.com

Plataforma de tardeo y ocio de media tarde en España. Directorio de bares, cafés, pubs y terrazas con cobertura nacional, gestionado por agentes IA.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15.5 + Tailwind + TypeScript |
| Exportación | Static export (`output: export`) → HTML estático |
| Hosting | Cloudflare Pages |
| API serverless | Cloudflare Pages Functions (`/functions/`) |
| Base de datos | Cloudflare D1 |
| Mapa interactivo | Leaflet + OpenStreetMap |
| Email marketing | Listmonk (self-hosted) + Brevo (transaccional) |

> **Importante:** Las API routes de Next.js no funcionan con static export. Toda la lógica de servidor está en `/functions/` como Cloudflare Pages Functions.

---

## Estructura del proyecto

```
app/
  page.tsx                    # Landing principal con buscador de ciudades
  locales/[ciudad]/
    page.tsx                  # Server component — generateStaticParams
    CiudadPage.tsx            # Client component — listado + mapa + filtros
    MapaLocales.tsx           # Mapa Leaflet (carga dinámica, sin SSR)
  local/                      # Área privada de locales (login, registro, dashboard)
  para-locales/               # Landing B2B para propietarios

functions/                    # Cloudflare Pages Functions
  api/
    locales/                  # Listado público con filtros
    local/                    # Auth, perfil, fotos, menú, eventos, stats
    subscribe/                # Suscripción email
    stripe/                   # Webhook pagos
  locales/[id].js             # Ficha pública de local con mapa OSM
  sitemap*.js                 # Sitemaps dinámicos

data/
  cities.json                 # Ciudades publicadas (slug + nombre)
  ciudad-content.json         # Contenido SEO por ciudad (intro, barrios, FAQs, coords)

scripts/
  scraper_batch.py            # Scraper masivo Overpass API — ~89 ciudades españolas
  sync-cities.mjs             # Sincroniza D1 → cities.json → deploy automático
  generar_content.py          # Genera contenido SEO inicial para ciudades sin datos
  enriquecedor.py             # Enriquece datos de locales (web, Instagram)
  schema.sql                  # Esquema completo D1

public/
  _routes.json                # Excluye slugs de ciudades del CF Worker
```

---

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # genera /out (estático)
```

---

## Deploy

```bash
npm run build

export CLOUDFLARE_API_TOKEN=<tu_token>
export CLOUDFLARE_ACCOUNT_ID=<tu_account_id>
npx wrangler pages deploy out --project-name=tresycuarto --branch=main
```

---

## Sistema de ciudades

### Flujo completo

1. **Scraper** extrae locales de OpenStreetMap (Overpass API)
2. **Umbral de calidad**: solo se publica una ciudad con ≥10 locales con dirección
3. **Sync automático** (cron 07:00): detecta ciudades nuevas en D1 y publica
4. **Contenido SEO** (cron 06:00): genera intro, barrios y FAQs para ciudades nuevas

### Scraper batch

```bash
python3 scripts/scraper_batch.py                   # todas las ciudades pendientes
python3 scripts/scraper_batch.py --solo "Pamplona" # una ciudad concreta
python3 scripts/scraper_batch.py --forzar          # re-raspar aunque ya haya datos
```

### Publicación automática

```bash
node scripts/sync-cities.mjs           # simular (sin deploy)
node scripts/sync-cities.mjs --deploy  # build + deploy si hay ciudades nuevas
```

Consulta D1, compara con `cities.json` y publica las ciudades que cumplen el umbral. Se ejecuta a las 07:00 via cron.

### Contenido SEO por ciudad

`data/ciudad-content.json` — formato por ciudad:

```json
{
  "NombreCiudad": {
    "coords": { "lat": 40.4168, "lon": -3.7038 },
    "intro": "Texto descriptivo sobre el tardeo en la ciudad...",
    "barrios": ["Barrio1", "Barrio2", "Barrio3", "Barrio4", "Barrio5"],
    "faqs": [
      { "q": "¿Dónde tardeear en NombreCiudad?", "a": "..." },
      { "q": "¿Qué tomar en el tardeo de NombreCiudad?", "a": "..." },
      { "q": "¿A qué hora es el tardeo en NombreCiudad?", "a": "..." },
      { "q": "¿Cuántos locales hay en NombreCiudad?", "a": "..." }
    ]
  }
}
```

Si `ANTHROPIC_API_KEY` está configurada, el cron de las 06:00 genera este contenido automáticamente con Claude Sonnet para las ciudades que lo necesiten.

---

## Páginas de ciudad

Cada ciudad publicada tiene `/locales/{slug}` con:

- Previsión meteorológica 5 días (Open-Meteo, sin API key)
- Intro + barrios característicos
- Filtros: Todos / Bar / Pub / Cafetería / Con terraza
- Mapa Leaflet con los locales de la página actual (pines por tipo)
- Grid de cards (nombre, tipo, dirección, horario) enlazadas a la ficha
- FAQs con schema.org para SEO

Las páginas se generan en build via `generateStaticParams` leyendo `cities.json`. Las ciudades sin datos suficientes muestran "próximamente" sin indexación.

---

## Ficha de local

`/locales/{id}` — servida por CF Function con:

- Datos completos del local
- Mapa OpenStreetMap embebido
- Enlace de navegación a Google Maps
- Schema.org `BarOrPub`

---

## Crons

| Hora | Función |
|------|---------|
| 06:00 | Genera contenido SEO (intro/FAQs) para ciudades nuevas |
| 07:00 | Detecta ciudades nuevas en D1 y despliega si las hay |
| 08:00 | Notifica por email a suscriptores de nuevas ciudades |

---

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `CLOUDFLARE_API_TOKEN` | Deploy a Pages, consultas D1 |
| `CLOUDFLARE_ACCOUNT_ID` | Identificador de cuenta Cloudflare |
| `ANTHROPIC_API_KEY` | (opcional) Generación automática de contenido SEO |

---

## Diseño

| Color | Hex | Uso |
|-------|-----|-----|
| Crema | `#FFF8EF` | Fondo principal |
| Melocotón | `#FB923C` | Acento principal, CTAs |
| Dorado | `#F59E0B` | Degradados |
| Lavanda | `#A78BFA` | Pills ciudades y barrios |

---

## URLs

| | URL |
|-|-----|
| Producción | https://tresycuarto.com |
| Cloudflare Pages | https://tresycuarto.pages.dev |
| Email marketing | https://listmonk.tresycuarto.com |

---

## Roadmap

- [ ] Rutas de tardeo auto-generadas por barrio (mayor diferenciador)
- [ ] Geolocalización "cerca de mí"
- [ ] Filtros pet-friendly / con niños (datos OSM disponibles)
- [ ] Eventos de tardeo publicados por propietarios
- [ ] Mapa de calor por barrio
