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

## Deploy
```bash
cd /root/tresycuarto-sync
npm run build
export CLOUDFLARE_API_TOKEN=KbzsvBydROCvDbDtOab3dJHV_6w5REZhPnJkheix
export CLOUDFLARE_ACCOUNT_ID=0c4d9c91bb0f3a4c905545ecc158ec65
npx wrangler pages deploy out --project-name=tresycuarto --branch=main
```

## URLs
- Producción: https://tresycuarto.com
- Pages: https://tresycuarto.pages.dev

## Diseño
- Crema #FFF8EF | Melocotón #FB923C | Dorado #F59E0B | Lavanda #A78BFA

## GitHub
- Repo: joseluisnebot/tresycuarto.com
- Local CT: /root/tresycuarto-sync/  ← ÚNICO lugar de trabajo
- Local VM: /home/ubuntu/tresycuarto/ ← OBSOLETO, ignorar

## Estado actual (26/03/2026)
- 64 ciudades activas con páginas, contenido y rutas configuradas
- Fotos Google Places: 1.929/40.707 locales (cron 4:00, 500/día, prioridad Semana Santa)
- 10 rutas de tardeo en data/rutas.json (Madrid, Barcelona, Valencia, Sevilla)
