# Proyecto: tresycuarto.com

Plataforma de tardeo y ocio de media tarde en España.

## Stack
- Next.js 15.5 + Tailwind + TypeScript
- Cloudflare Pages (static export)
- Cloudflare D1 (base de datos): `tresycuarto-db` — ID: `458672aa-392f-4767-8d2b-926406628ba0`
- Cloudflare R2 (media): `tresycuarto-media`
- API: Cloudflare Pages Functions en `/functions/`

## REGLA CRÍTICA — Fuente única de verdad

**SIEMPRE trabajar desde `/root/tresycuarto-sync/` en el CT.**
**NUNCA usar la VM (192.168.1.150) para builds ni edits.**

La VM `/home/ubuntu/tresycuarto/` está obsoleta y puede ignorarse.
El CT tiene node_modules y puede compilar directamente.

### Flujo obligatorio para cualquier cambio:
```
1. Editar ficheros en /root/tresycuarto-sync/  (Write tool va aquí directamente)
2. npm run build                                (verificar que compila)
3. git add + git commit                         (ANTES de deploy — siempre)
4. git push origin main
5. npx wrangler pages deploy out ...            (deploy)
```

**Si no hay commit, no hay deploy.** El commit es la garantía de que podemos recuperar cualquier estado.

### Ciudades que requieren 3 ficheros sincronizados:
Al añadir una ciudad nueva, siempre los 3:
1. `data/cities.json` — slug + nombre
2. `data/ciudad-content.json` — coords + intro + barrios + faqs
3. `public/_routes.json` — añadir `/locales/[slug]/` a la lista exclude

## Deploy — USAR SIEMPRE EL SCRIPT CON GUARDAS

**Forma correcta y única de desplegar (no usar `wrangler` a mano):**
```bash
cd /root/tresycuarto-sync
git add -A && git commit -m "..." && git push origin main   # 1. commitear SIEMPRE antes
export CLOUDFLARE_API_TOKEN=<token master de credentials.md>  # NO hardcodear en el repo
export CLOUDFLARE_ACCOUNT_ID=0c4d9c91bb0f3a4c905545ecc158ec65
bash scripts/deploy.sh                                        # 2. build + deploy + smoke test
```

`scripts/deploy.sh` aborta el deploy si detecta cualquiera de los 3 fallos que ya
ocurrieron en el pasado, y verifica el resultado en producción tras desplegar.

### REGLA 1 — Desplegar solo desde estado commiteado
**Si no hay commit, no hay deploy.** El build copia `public/` a `out/`, así que un
cambio sin commitear se despliega aunque en git no se vea. Eso es exactamente lo que
dejó las fichas en 404 durante meses (ver REGLA 2). El script aborta si hay cambios
trackeados sin commitear.

### REGLA 2 — `public/_routes.json`: NUNCA excluir `/locales/*` ni `/`
En Cloudflare Pages, `exclude` = "no ejecutar Functions, servir como estático".
- Las **fichas de local** `/locales/[ciudad]/[slug]` las genera la Function
  `functions/locales/[ciudad]/[slug].js`. Si `/locales/*` está en `exclude`, la Function
  NO se ejecuta y **toda ficha de local da 404** (sirve el 404 estático de Next).
- La **home** `/` la sirve `functions/index.js` (redirect de subdominios bio). Excluir `/`
  lo rompe.
- Las páginas de ciudad `/locales/[ciudad]/` son estáticas (SSG) y siguen funcionando
  igual aunque NO estén excluidas: la Function pasa a `env.ASSETS.fetch()` cuando no hay
  match. Por eso es seguro no excluir `/locales/*`.
- Verificación rápida del fallo: `curl https://tresycuarto.com/locales/madrid/<slug-real>`
  debe devolver 200 con la ficha; si sale "This page could not be found", el routing está
  roto por un `exclude` mal puesto.

### REGLA 3 — Nada de datos sensibles en el repo (es PÚBLICO)
- **Sin secretos hardcodeados** en `functions/` ni `scripts/`. Credenciales por
  Pages Secret (`npx wrangler pages secret put NOMBRE`) y leídas con `env.NOMBRE`.
  Secrets ya configurados: `ADMIN_TOKEN`, `BREVO_API_KEY`, `LISTMONK_API_USER/PASS`,
  `STRIPE_*`, `TURNSTILE_SECRET`, `CF_ANALYTICS_TOKEN`, `CF_ACCESS_CLIENT_*`, `BROWSER_TOKEN`.
- **Endpoints públicos: nunca `SELECT * FROM locales`.** La tabla tiene columnas privadas
  (`email`, `email_personal`, `email_outreach_sent`). Enumerar columnas explícitas y dejar
  fuera esas tres. Aplica a `functions/api/locales/`, `functions/api/app/`, `functions/locales/`.

El script bloquea el deploy si encuentra secretos hardcodeados o `SELECT *` en endpoints
públicos.

### Deploy manual (solo si el script falla por algo puntual)
```bash
npm run build
# Verificar a mano que out/_routes.json NO contiene "/locales/*" ni "/" en exclude
npx wrangler pages deploy out --project-name=tresycuarto --branch=main
# Smoke test: curl una ficha real, la home y una ciudad — todas 200
```

## URLs
- Producción: https://tresycuarto.com
- Pages: https://tresycuarto.pages.dev

## Diseño
- Crema #FFF8EF | Melocotón #FB923C | Dorado #F59E0B | Lavanda #A78BFA
- Guía completa: `STYLE.md` — leer SIEMPRE antes de tocar cualquier componente visual

## REGLA DE ESTILO — Nunca romper el diseño
1. **Antes de editar cualquier archivo TSX/CSS/JS/HTML**: leer el fichero completo con Read tool. Sin excepción.
2. **No cambiar** colores, tipografía, bordes, espaciados, shadows, botones, layout ni información que no estén en el diff solicitado
3. **Verificación obligatoria** tras cada cambio visual: `npm run build` debe pasar sin errores
4. **Si el cambio es solo funcional** (lógica, datos, API): no tocar ningún `style={{...}}` ni clases CSS
5. **Si el usuario no pide cambio visual**: asumir que el estilo actual es correcto y preservarlo al 100%
6. **Scope mínimo**: modificar ÚNICAMENTE lo que se pidió. Nada más. Cualquier "mejora" no solicitada está prohibida.

## GitHub
- Repo: joseluisnebot/tresycuarto.com
- Local CT: /root/tresycuarto-sync/  ← ÚNICO lugar de trabajo
- Local VM: /home/ubuntu/tresycuarto/ ← OBSOLETO, ignorar

## Credenciales de scripts/crons — `/root/.tresycuarto_env`
**Todos los scripts y crons cargan sus credenciales de `/root/.tresycuarto_env`** (chmod 600, FUERA del repo). Contiene `CLOUDFLARE_API_TOKEN` (master), `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_TOKEN`, `MAPILLARY_TOKEN`. Los `.py` hacen *fail-fast* si falta la env var; los wrappers `.sh` hacen `source /root/.tresycuarto_env`. **Nunca hardcodear tokens en el repo** (es público).

### Credenciales MUERTAS (a 12/06/2026) — verificar antes de usar
- **Mapillary**: token caducado (OAuthException) → era la mayor fuente de fotos (12.573). Regenerar en mapillary.com y pegar en `/root/.tresycuarto_env`. El loop (`mapillary_loop.sh`) no está en cron.
- **Google Search Console + Gmail**: el proyecto GCP `gmail-api-claude-access` está deshabilitado → SA da `invalid_grant`, Gmail MCP da `disabled_client`. **Los datos de GSC llegan como CSV a `/root/inbox/`** (coger el timestamp más alto). Detalle: memoria `project_search_console.md`.

## Flujo de propietario (locales)
- **Modelo GRATUITO** (decidido 12/06/2026): todas las funciones abiertas a todos. `isPlanActive()` devuelve `true` en `functions/api/local/{fotos,menu,eventos,stats}.js`. No hay botón "Hazte Pro". Para reactivar freemium: restaurar la lógica plan/trial (comentada) + UI real + checkout Stripe (que ya existe).
- **Claims AUTO-OTORGADOS**: al reclamar una ficha existente (`/api/solicitud`, `tipo_solicitud=claim`) se marca `claimed=1` y se envía el email de registro al instante (sin admin). Aviso a Jose Luis de cada uno. Local nuevo por solicitud → admin lo aprueba (`/api/admin/solicitud`) y entonces envía el email de registro.
- **Verificación de email para EDITAR**: el dueño entra y ve su panel sin verificar, pero los POST/PUT/DELETE de perfil/fotos/menu/eventos/tema devuelven 403 si `verified=0`. GET abierto. Endpoint `/api/local/reenviar-verificacion` + botón en el dashboard.
- **Plantillas de la ficha pública** (`/[slug]`, `functions/[slug].js`): 3 distintas — **Fresh** (link-in-bio, botones verticales), **Bold** (inmersiva oscura, galería horizontal + contacto en rejilla), **Elegante** (web de restaurante, serif). Helpers compartidos: `ratingStars`, `barraAcciones` (Llamar/Cómo llegar fija móvil), `shareBtn`, `jsonLd`. Color elegible por el dueño.

## Eventos
- Tabla `eventos_geo` (scraper) + `eventos` (de dueños). Scraper `scraper_eventos.py` (cron 3,15) → solo ingiere eventos **promocionables** (`es_promocionable`: descarta charlas/talleres/visitas/online; mantiene lo que atrae público). Limpieza 12/06: 500 eventos no-promocionables desactivados (`activo=0`).
- API `/api/eventos`: filtro `?ciudad=` y **búsqueda `?q=`**; devuelve lista de ciudades con conteo. Página `/eventos`: buscador de texto + botones de ciudad dinámicos.

## SEO (claves — ver memoria `project_search_console.md`)
- **Insight GSC**: ~345k impr/3 meses, CTR 0,68%. Las búsquedas de MARCA de un bar no convierten (Google muestra la ficha del propio bar). El oro son las páginas de **intención** ("tardeo en X", rutas, ciudad): 10-19% CTR.
- **Sitemap** (`functions/sitemap.xml.js`): incluye ciudades + fichas + `/tardeo/*` + `/terrazas/*` + `/rutas/*` (importa las fuentes JSON). **NUNCA volver a excluir tardeo/rutas.**
- **Canonicals**: en `/locales/[ciudad]` y `/eventos` (layout). `metadataBase` en `app/layout.tsx`. tardeo/terrazas ya tenían.
- Fichas SEO (`functions/locales/[ciudad]/[slug].js`) ya llevan JSON-LD `BarOrPub` + `aggregateRating`.

## Rutas de tardeo — `scripts/generar_rutas.py`
112 rutas (data/rutas.json). Generador de CALIDAD: paradas = **bares reales** (rating≥4, ≥20 reseñas, foto, dirección), sugerencia acorde al tipo, **sin LLM** (alucinaba). Modos:
- `--auto` → ruta de "centro" para ciudades con ≥4 bares y sin ruta
- `--barrios-auto` → rutas por barrio en ciudades grandes (clustering por coordenadas + nombre real del barrio por Nominatim + dedup por tokens)
- `--ciudad "X"` / `--barrios "X"` / `--dry-run`
Re-ejecutar cuando el enriquecedor sume rating/foto a más bares → más rutas.

## Estado de datos (12/06/2026)
- ~43.700 locales · 6% con web propia · ~30% con foto · horario 94% (OSM)
- 539 eventos de tardeo activos · 112 rutas · 2 dueños registrados (claim auto-otorgado activo)
