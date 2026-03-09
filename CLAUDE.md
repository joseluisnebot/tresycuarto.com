# tresycuarto.com — Contexto del Proyecto

## Qué es esto
Plataforma de "tardeo" y ocio de media tarde en España. El objetivo es escalar el valor del dominio
creando una base de datos de usuarios y locales con coste cero. El sistema debe ser gestionado
mayoritariamente por agentes de IA.

## Propietario
Jose Luis Nebot — JoseluisNebot@gmail.com
Cloudflare account ID: 0c4d9c91bb0f3a4c905545ecc158ec65

## Stack tecnológico
- **Frontend**: Next.js 15 (static export) → Cloudflare Pages
- **Base de datos**: Supabase free tier (pendiente de configurar) o Cloudflare D1
- **Email/suscriptores**: MailerLite free (hasta 1.000 subs)
- **Mapas/locales**: OpenStreetMap + Overpass API (gratuito)
- **Scraping**: Python + BeautifulSoup/Playwright
- **Deploy**: Wrangler CLI → Cloudflare Pages

## Estructura del proyecto
```
/home/ubuntu/tresycuarto/     ← proyecto Next.js principal
/home/papa/tresycuarto/       ← directorio local del propietario con scripts
  ├── scripts/                ← scrapers Python (Overpass, Instagram, etc.)
  ├── data/                   ← JSONs de locales extraídos
  ├── infra/                  ← configuración Cloudflare, Supabase
  └── web/                    ← (symlink o referencia al proyecto Next.js)
```

## URLs
- **Producción**: https://tresycuarto.pages.dev
- **Dominio final**: https://tresycuarto.com (pendiente de conectar)

## Comandos clave
```bash
# Desarrollo local (hot reload en http://192.168.1.150:3000)
cd ~/tresycuarto && npm run dev

# Build + deploy a Cloudflare Pages
cd ~/tresycuarto
npm run build
wrangler pages deploy out --project-name=tresycuarto --branch=main

# Scraper de locales OSM (cuando esté implementado)
cd /home/papa/tresycuarto/scripts
python3 overpass_scraper.py --ciudad "Madrid" --radio 10 --output ../data/madrid.json
```

## Variables de entorno necesarias
```bash
CLOUDFLARE_API_TOKEN=WCvwZkoXOw_qE6onJYlsVrqupNoIt3msrgo2WGIM
CLOUDFLARE_ACCOUNT_ID=0c4d9c91bb0f3a4c905545ecc158ec65
MAILERLITE_API_KEY=<pendiente — obtener en mailerlite.com>
SUPABASE_URL=<pendiente>
SUPABASE_ANON_KEY=<pendiente>
```

## Restricción financiera ESTRICTA
- Coste mensual objetivo: 0€
- Prohibido: Google Maps API, cualquier servicio con tarjeta obligatoria desde el inicio
- Permitido: capas gratuitas de Cloudflare, Supabase, MailerLite, Overpass API, OSM

## Diseño y marca
- **Paleta**: tonos pastel que evocan la tarde española
  - Fondo: crema cálido #FFF8EF → #FEF0DC
  - Acento: naranja melocotón #FB923C
  - Dorado: #F59E0B / #FCD34D
  - Lavanda: #A78BFA (ciudades)
  - Cards: amarillo suave, lavanda, rosa pálido
- **Tipografía**: Geist (Google Fonts)
- **Tono**: cercano, español, tarde de domingo, sin pretensiones

## Roadmap
### Fase 1 — COMPLETADA
- [x] VM en Proxmox (192.168.1.150, ubuntu@tresycuarto-dev)
- [x] Next.js 15 + Tailwind + TypeScript
- [x] Landing page con formulario de suscripción
- [x] Deploy en Cloudflare Pages
- [x] Claude Code instalado en VM

### Fase 2 — EN CURSO
- [ ] Conectar dominio tresycuarto.com en Cloudflare
- [ ] Configurar MailerLite y conectar formulario
- [ ] Script Overpass API para extraer locales por ciudad
- [ ] Base de datos Supabase o D1 con esquema de locales

### Fase 3 — PENDIENTE
- [ ] Fichas públicas de locales (SEO, generación automática)
- [ ] Agente de scouting: OSM → buscar Instagram → almacenar
- [ ] Dashboard de admin básico
- [ ] Sistema de captación de locales (formulario para que se apunten)

## Arquitectura de agentes planeada
1. **Agente Scraper**: extrae locales de Overpass API por ciudad
2. **Agente Enriquecedor**: busca Instagram/web de cada local en directorios públicos
3. **Agente Generador**: crea fichas estáticas de locales automáticamente
4. **Agente SEO**: optimiza metadatos y genera contenido de ciudad

## Notas técnicas importantes
- Next.js usa `output: "export"` (static export) — sin SSR en el servidor
- Las API routes de Next.js NO funcionan con static export → usar Cloudflare Pages Functions en `/functions/`
- El token de Cloudflare tiene permisos: Workers Scripts Edit, Pages Edit, D1 Edit
- wrangler pages deploy requiere `CLOUDFLARE_ACCOUNT_ID` como env var (no en wrangler.toml para Pages)
- SSH a la VM: `ssh tresycuarto-dev` (config en ~/.ssh/config del PC del propietario)
