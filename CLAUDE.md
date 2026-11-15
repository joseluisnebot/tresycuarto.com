# tresycuarto.com — reglas

Plataforma de tardeo en España. Next.js static export + Cloudflare Pages/D1/R2, API en
`functions/`. Contexto completo en `docs/CONTEXTO.md` (leerlo cuando haga falta).

## Reglas críticas
1. **Trabajar solo en `/root/tresycuarto-sync/`** (la VM 192.168.1.150 está obsoleta).
2. **Commit + push ANTES de desplegar.** Sin commit no hay deploy.
3. **Desplegar siempre con `bash scripts/deploy.sh`** tras `source /root/.tresycuarto_env`
   (nunca `wrangler` a mano salvo que el script falle).
4. **`public/_routes.json`: nunca excluir `/locales/*` ni `/`** (las fichas y la home son Functions).
5. **El repo es PÚBLICO**: ningún secreto en el código (Pages Secrets / `/root/.tresycuarto_env`)
   y nunca `SELECT *` en endpoints públicos (`locales` tiene columnas privadas).
6. **Notas de locales**: solo son reales con `google_place_id` y ≤ 5.000 reseñas. Nada de
   notas inventadas ni `aggregateRating`.

## Estilo
- Leer `STYLE.md` y el fichero ENTERO antes de tocar algo visual.
- No cambiar colores, tipografía, espaciados ni layout que no se hayan pedido; cambios
  funcionales sin tocar estilos; `npm run build` debe pasar. Scope mínimo.

## Al cambiar algo que vigila la empresa
URLs de muestra, rutas, `data/rutas.json`, logs de newsletter o eventos, o el JSON de
`logs/candidatas_rutas/` → avisar a la sesión MI---EMPRESON.
