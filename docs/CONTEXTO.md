# tresycuarto.com — contexto de referencia

Detalle que antes estaba en `CLAUDE.md` (movido el 15/11/2026 para que no se cargue en
cada mensaje). Las reglas que no se pueden saltar siguen en `CLAUDE.md`.

## Stack y sitios
- Next.js 15.5 + Tailwind + TypeScript, static export → Cloudflare Pages (proyecto `tresycuarto`)
- D1 `tresycuarto-db` (`458672aa-392f-4767-8d2b-926406628ba0`) · R2 `tresycuarto-media`
- API: Pages Functions en `/functions/` (las API routes de Next no funcionan en static export)
- Producción https://tresycuarto.com · Pages https://tresycuarto.pages.dev
- Repo `joseluisnebot/tresycuarto.com` (PÚBLICO) · trabajo solo en `/root/tresycuarto-sync/`
  (la VM `192.168.1.150:/home/ubuntu/tresycuarto/` está obsoleta)

## Ciudad nueva: 3 ficheros sincronizados
1. `data/cities.json` — slug + nombre
2. `data/ciudad-content.json` — coords + intro + barrios + faqs
3. `public/_routes.json` — añadir `/locales/[slug]/` a exclude (nunca `/locales/*` ni `/`)

## Deploy: por qué las reglas
- **Commit antes de desplegar**: el build copia `public/` a `out/`, así que un cambio sin
  commitear se despliega aunque git no lo vea (así se quedaron las fichas en 404 meses).
- **`_routes.json`**: `exclude` = "no ejecutar Functions". Las fichas
  `/locales/[ciudad]/[slug]` las genera `functions/locales/[ciudad]/[slug].js`; la home `/`
  la sirve `functions/index.js`. Excluirlos rompe ambas. Las páginas de ciudad son SSG y la
  Function pasa a `env.ASSETS.fetch()` si no hay match. Comprobar:
  `curl https://tresycuarto.com/locales/madrid/<slug-real>` → 200 con la ficha.
- **Repo público**: secretos solo como Pages Secret (`npx wrangler pages secret put NOMBRE`,
  leídos con `env.NOMBRE`). Configurados: `ADMIN_TOKEN`, `BREVO_API_KEY`,
  `LISTMONK_API_USER/PASS`, `STRIPE_*`, `TURNSTILE_SECRET`, `CF_ANALYTICS_TOKEN`,
  `CF_ACCESS_CLIENT_*`, `BROWSER_TOKEN`. Nunca `SELECT * FROM locales` en endpoints
  públicos (columnas privadas `email`, `email_personal`, `email_outreach_sent`).
- `scripts/deploy.sh` bloquea los tres fallos, despliega, hace smoke test y avisa a Bing
  de las rutas nuevas (`/root/scripts/bing.py --rutas-nuevas`).
- Deploy manual solo si el script falla: `npm run build`, revisar `out/_routes.json`,
  `npx wrangler pages deploy out --project-name=tresycuarto --branch=main`, smoke test.

## Credenciales de scripts y crons
`/root/.tresycuarto_env` (chmod 600, fuera del repo): `CLOUDFLARE_API_TOKEN` (maestro),
`CLOUDFLARE_ACCOUNT_ID`, `ADMIN_TOKEN`, `MAPILLARY_TOKEN`, `BREVO_API_KEY`, `BROWSER_TOKEN`,
`BING_API_KEY`. Los `.py` fallan si falta la variable; los `.sh` hacen `source`.
Valores y estado de cada token: memoria `credentials.md`.
- Search Console: **por API** desde el 04/11/2026 → `python3 /root/scripts/gsc.py tresycuarto
  [--dias N] [--filtro /rutas/] [--indice]` (ya no hay CSV).
- Bing: `python3 /root/scripts/bing.py [--consultas] [--paginas] [--enviar URL…]`.
  IndexNow retirado el 10/11/2026.
- Mapillary: `/root/scripts/mapillary_cron.sh` los martes, solo Barcelona y Sevilla.

## Notas de los locales (regla desde el 15/11/2026)
Una nota es real solo si `google_place_id` no está vacío **y** `rating_count <= 5000`.
Las demás (~40.000 sintéticas + 57 cruzadas con parques/plazas) no se muestran nunca.
Sin JSON-LD `aggregateRating` en las fichas (guía de Google: ni reseñas falsas ni copiadas
de otra web). La indexación de fichas aún usa el recuento bruto (`rating_count_bruto`).

## Flujo de propietario
- Modelo gratuito: `isPlanActive()` devuelve `true` en `functions/api/local/{fotos,menu,eventos,stats}.js`.
- Claim de ficha existente auto-otorgado (`/api/solicitud`, `tipo_solicitud=claim`); local
  nuevo lo aprueba el admin (`/api/admin/solicitud`).
- Editar exige email verificado (POST/PUT/DELETE → 403 si `verified=0`).
- Página bio `/[slug]` (`functions/[slug].js`): plantillas Fresh, Bold y Elegante.

## Eventos
- `eventos_geo` (scraper) + `eventos` (de dueños). `scripts/scraper_eventos.py` (3:00 y
  15:00) → geocodificar → matching con locales.
- Filtro de tardeo `motivo_descarte()`: desde las 16:00 (festival/feria/procesión/gastronomía
  no), sin charlas, cursos, visitas, inscripción previa ni culto; exposiciones solo la
  inauguración, cine solo al aire libre o ciclos, deporte solo carreras y derbis.
  Lo infantil solo el sábado por la tarde con `con_ninos=1`.
- Fuentes: Open Data Madrid, Junta de Castilla y León y agendas HTML (Ollama extrae).
  `"navegador": True` = Browser Run vía `/api/browser-texto` (tope 5 h/mes,
  `logs/browser_eventos_ms.json`). `scripts/refiltrar_eventos.py` reaplica el filtro.

## Rutas de tardeo
- `data/rutas.json` → `/rutas/[slug]`. Listón: nota real (ver arriba) ≥ 4,0 y ≥ 20 reseñas.
- `scripts/generar_rutas.py` (`--ciudad`, `--barrios`, `--auto`, `--sin-foto`, `--dry-run`).
- `scripts/candidatas_rutas.py`: candidatas semanales (la empresa lo lanza los lunes 09:05);
  JL elige y se publican con `--publicar ID`. Revisar antes: slug existente, distancia al
  centro, notas reales.
- `scripts/geolocalizar_paradas.py` (lat/lon de paradas) · `scripts/rehacer_rutas_rotas.py`.
- Nominatim: nunca dos scripts a la vez (429).

## SEO
- Lo que convierte son las páginas de intención: rutas, ciudad, "tardeo en X". Las fichas bajan.
- Sitemap `functions/sitemap.xml.js`: ciudades, fichas, `/tardeo/*`, `/terrazas/*`, `/rutas/*`
  (nunca volver a excluir tardeo ni rutas). Canonicals con `metadataBase` en `app/layout.tsx`.
- `public/robots.txt` + regla WAF bloquean herramientas SEO y bots que entrenan IA;
  Google, Bing, OAI-SearchBot y Perplexity entran.
- Embudo sin cookies: `public/m.js` → `/api/m` → Analytics Engine; `python3 /root/scripts/embudo.py`.

## Procesos parados el 15/11/2026 (orden de JL)
`enriquecedor.service`, `scraper_emails_web.py` y `generar_descripciones.py`. Reactivar:
descomentar la línea marcada "PARADO 15/11/2026" y `systemctl enable --now enriquecedor`.

## Datos (15/11/2026)
~43.700 locales · 2.958 notas reales · 113 rutas · ~377 eventos de tardeo activos ·
6 suscriptores (3 reales). Estado y decisiones: memoria `project_tresycuarto_estado.md`.
