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

## Estado actual (26/03/2026)
- 64 ciudades activas con páginas, contenido y rutas configuradas
- Fotos Google Places: 1.929/40.707 locales (cron 4:00, 500/día, prioridad Semana Santa)
- 10 rutas de tardeo en data/rutas.json (Madrid, Barcelona, Valencia, Sevilla)
