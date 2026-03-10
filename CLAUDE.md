# Proyecto: tresycuarto.com

Plataforma de tardeo y ocio de media tarde en España.

## Stack
- Next.js 15.5 + Tailwind + TypeScript
- Cloudflare Pages (static export)
- Cloudflare D1 (base de datos): `tresycuarto-db` — ID: `458672aa-392f-4767-8d2b-926406628ba0`
- Cloudflare R2 (media): `tresycuarto-media`
- API: Cloudflare Pages Functions en `/functions/`

## Notas críticas
- Static export: API routes de Next.js NO funcionan → usar `/functions/`
- Deploy desde la VM tresycuarto-dev (192.168.1.150), no desde el CT

## Deploy
```bash
ssh -i /root/.ssh/tresycuarto_vm ubuntu@192.168.1.150
cd ~/tresycuarto
npm run build
export CLOUDFLARE_API_TOKEN=lEduOPo2NZzDKY7gyEMjkMJkZHf1MFKBg6T_5aau
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
- Local CT: /root/tresycuarto-sync/
- Local VM: /home/ubuntu/tresycuarto/ (tiene node_modules, builds aquí)

## Roadmap
1. Conectar dominio tresycuarto.com en Cloudflare Pages
2. MailerLite API key → conectar formulario suscripción
3. Fichas públicas de locales (SEO)
4. Agentes: scraper OSM → enriquecedor Instagram → generador fichas
