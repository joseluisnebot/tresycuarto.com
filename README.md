# tresycuarto.com

Plataforma de tardeo y ocio de media tarde en España. Directorio nacional de bares, cafés, pubs y terrazas con cobertura en 63 ciudades, gestionado íntegramente por agentes IA.

> El nombre viene de las 15:15 — la hora del tardeo. Todo lo que pasa en este sistema ocurre de forma autónoma: los locales se scrапean, se enriquecen, se geolocalizan, se genera contenido SEO y se envían newsletters sin intervención manual.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15.5 + Tailwind + TypeScript |
| Exportación | Static export (`output: export`) → HTML estático |
| Hosting | Cloudflare Pages |
| API serverless | Cloudflare Pages Functions (`/functions/`) |
| Base de datos | Cloudflare D1 (SQLite en el edge) |
| Mapa interactivo | Leaflet + OpenStreetMap |
| Email marketing | Listmonk (self-hosted) + Brevo (transaccional) |
| Enriquecimiento | Google Places API (New) |
| Eventos | API Turismo de España |
| Scraping locales | OpenStreetMap Overpass API |
| Geocodificación | Nominatim + Ollama (LLM local) |

> **Importante:** Las API routes de Next.js no funcionan con static export. Toda la lógica de servidor está en `/functions/` como Cloudflare Pages Functions.

---

## Base de datos — Cloudflare D1

### Tablas

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `locales` | ~40.700 | Bares, pubs, cafeterías, terrazas de 63 ciudades |
| `eventos_geo` | ~700 | Eventos culturales y de ocio con geolocalización |
| `eventos_geo_locales` | ~14.100 | Matching geoespacial evento↔local por radio |
| `solicitudes` | — | Solicitudes B2B de propietarios |
| `locales_auth` | — | Tokens de autenticación del panel propietario |
| `usuarios` | — | Usuarios del panel propietario |
| `usuario_locales` | — | Relación usuario↔local |

### Estados de un evento

```
pendiente → aprobado → enviado
         ↘ rechazado
```

- `pendiente`: recién scrapeado, esperando revisión del admin
- `aprobado`: aprobado manualmente, listo para enviar newsletter
- `enviado`: newsletter ya enviada a los suscriptores
- `rechazado`: descartado manualmente

---

## Arquitectura de agentes

El sistema funciona con **dos capas de agentes**:

1. **Agentes del servidor** (`/root/scripts/`) — gestionan el ciclo de vida completo: scraping de eventos, envío de emails, publicación en redes sociales
2. **Agentes del proyecto** (`/root/tresycuarto-sync/scripts/`) — gestionan los datos: enriquecimiento de locales, geocodificación, matching geoespacial

---

## Agentes — ciclo diario completo

### Diagrama de flujo diario

```
02:00 (domingos)  Scraper OSM          → Nuevos locales en D1
03:00 + 15:00     Scraper eventos      → Eventos nuevos (estado: pendiente)
04:00             Enriquecedor ratings → Fotos, valoraciones, horarios Google
06:00             Generador SEO        → Intro + FAQs + barrios por ciudad
07:00             Sync ciudades        → cities.json actualizado
08:00             Notif. ciudad nueva  → Email a suscriptores si hay ciudad nueva
09:00             Notif. eventos       → Email al admin si hay eventos pendientes
                                         ↓ admin aprueba o rechaza manualmente
15:15             Newsletter           → 1 email por suscriptor con eventos de su ciudad
10:00 + 18:00     Instagram            → Publica 2 reels/día (cola programada)
*/5 min           Monitor              → Alerta si cae algún servicio
```

---

## Descripción detallada de cada agente

---

### `scraper_eventos.py` — Scraper de eventos
**Cron:** `0 3,15 * * *` (3:00 y 15:00, todos los días)
**Ruta:** `scripts/scraper_eventos.py`

**Qué hace:**
Consulta la API de Turismo de España y extrae eventos culturales y de ocio (procesiones, conciertos, festivales, ferias, teatro, etc.) de todas las ciudades activas. Los inserta en la tabla `eventos_geo` con estado `pendiente`.

**Por qué dos veces al día:**
Para capturar eventos que se publican con poca antelación (algunos aparecen el mismo día del evento).

**Flujo tras el scraper:**
Inmediatamente después lanza `geocodificar_eventos.py --from-desc` para intentar asignar coordenadas a los nuevos eventos.

---

### `geocodificar_eventos.py` — Geocodificador de eventos
**Ejecutado:** Tras cada scrape de eventos
**Ruta:** `scripts/geocodificar_eventos.py`

**Qué hace:**
Los eventos de la API de Turismo llegan con dirección en texto libre pero sin coordenadas GPS. Este agente:
1. Extrae el venue/lugar del campo `descripcion` usando **Ollama** (LLM local, modelo `qwen2.5-coder:7b`)
2. Geocodifica la dirección resultante con **Nominatim** (OpenStreetMap)
3. Actualiza `lat` y `lon` en la tabla `eventos_geo`

**Caso especial:** Si el evento no tiene ubicación concreta (p.ej. "toda la ciudad"), su centroide queda a <300m del centro de la ciudad y se marca como `distancia_m=-1` en el matching. En ese caso se asignan 20 locales aleatorios de la ciudad.

---

### `matching_eventos.py` — Matching geoespacial evento↔local
**Ejecutado:** Manual / tras geocodificar
**Ruta:** `scripts/matching_eventos.py`

**Qué hace:**
Para cada evento con coordenadas, busca los locales de la base de datos que están dentro del radio definido en `radio_m` (columna del evento, típicamente 300-500m). Crea las relaciones en la tabla `eventos_geo_locales` con la distancia en metros de cada local al evento.

**Resultado:** Cuando un suscriptor recibe un email sobre un evento, puede ver exactamente qué bares y cafés tiene cerca del recorrido o lugar del evento.

---

### `notificar_eventos_pendientes.py` — Notificador de eventos pendientes
**Cron:** `0 9 * * *` (9:00, todos los días)
**Ruta:** `/root/scripts/notificar_eventos_pendientes.py`

**Qué hace:**
Consulta la base de datos buscando eventos en estado `pendiente` con fecha **futura o de hoy**. Si encuentra alguno, envía **un único email resumen** al admin (Jose Luis) con la lista de eventos pendientes de revisión y un enlace al dashboard para aprobarlos o rechazarlos.

**Por qué un solo email:**
Para no generar ruido. Un resumen diario es suficiente; si hay 40 eventos pendientes no se envían 40 emails sino uno con todos.

**Filtro de fecha importante:**
Solo notifica eventos con `fecha >= hoy`. Los eventos ya pasados no generan notificación aunque estén en estado `pendiente`.

---

### `enviar_newsletter.py` — Newsletter diaria a suscriptores
**Cron:** `15 15 * * *` (15:15, todos los días)
**Ruta:** `scripts/enviar_newsletter.py`

**Qué hace:**
Este es el agente central del producto. A las 15:15 (la hora del tardeo):

1. Busca eventos en estado `aprobado` cuya `fecha_envio = hoy`
   - `fecha_envio = fecha_evento - dias_previos_envio` (por defecto 2 días antes)
2. Obtiene todos los suscriptores activos de Listmonk
3. Para cada suscriptor, filtra los eventos que corresponden a **sus ciudades** (atributo `ciudades` en Listmonk)
4. Si hay eventos coincidentes, envía **un único email** con hasta 5 eventos vía Brevo
5. Marca como `enviado` **solo** los eventos de ciudades que tenían suscriptores

**Por qué solo marca los que tienen suscriptores:**
Si nadie está suscrito a Lorca pero hay un evento aprobado para dentro de 2 días, el evento se queda en `aprobado`. Si mañana alguien se suscribe a Lorca antes de que pase la fecha, **aún recibirá el email**. Los eventos de ciudades sin suscriptores no se "desperdician".

**Flujo de aprobación previo:**
```
Scraper detecta evento → estado: pendiente
Admin recibe email a las 9:00 → entra al dashboard
Admin aprueba → estado: aprobado
A las 15:15 del día de fecha_envio → newsletter sale
```

**Ejemplo:**
- Evento: Semana Santa en Zamora, fecha 2 abril
- `dias_previos_envio`: 2
- `fecha_envio`: 31 marzo
- El 31 de marzo a las 15:15, los suscriptores de Zamora reciben un email con ese evento (y hasta 4 más de su ciudad ese día)

---

### `notificar_ciudad_nueva.py` — Notificador de ciudades nuevas
**Cron:** `0 8 * * *` (8:00, todos los días)
**Ruta:** `/root/scripts/notificar_ciudad_nueva.py`

**Qué hace:**
Compara las ciudades activas en D1 con las que ya conocen los suscriptores. Si detecta una ciudad nueva (recién publicada), notifica a los suscriptores que habían pedido ser avisados cuando su ciudad estuviese disponible, usando el template "Ya tenemos tu ciudad" de Listmonk.

---

### `enriquecedor.py` + `enriquecedor_loop.sh` — Enriquecedor de locales
**Estado:** Proceso continuo en background (ciclos de 4h)
**Ruta:** `scripts/enriquecedor.py`

**Qué hace:**
Recorre todos los locales de la base de datos que aún no han sido enriquecidos (`enriquecido = 0`) y obtiene datos adicionales de fuentes externas:
- **Instagram:** seguidores, bio, URL de perfil
- **Web:** título, descripción, teléfono
- Marca el local como `enriquecido = 1` al completar

Procesa 100 locales por paso con 3 minutos de pausa entre ciudades para respetar los rate limits.

---

### `enriquecer_ratings.py` — Enriquecedor de datos Google
**Cron:** `0 4 * * *` (4:00, todos los días)
**Ruta:** `scripts/enriquecer_ratings.py`

**Qué hace:**
Consulta la **Google Places API (New)** para cada local y actualiza en D1:
- `photo_url`: foto principal del local
- `rating`: valoración media (0-5)
- `rating_count`: número de reseñas
- `price_level`: nivel de precio (INEXPENSIVE / MODERATE / EXPENSIVE)
- `horario_google`: horario de apertura por días de la semana
- `descripcion_google`: descripción editorial de Google

Estos datos se muestran en las fichas públicas de cada local (`/locales/{id}`).

---

### `overpass_scraper.py` + `importar_locales.py` — Pipeline de locales OSM
**Cron:** `0 2 * * 0` (2:00, domingos)
**Ruta:** `scripts/overpass_scraper.py`, `scripts/importar_locales.py`

**Qué hace:**
Scrapa todos los locales de tipo `bar`, `pub`, `cafe` y `biergarten` de OpenStreetMap para todas las ciudades activas, usando la Overpass API. Inserta los nuevos locales en D1 con `INSERT OR IGNORE` (no duplica).

**Flujo completo:**
1. `overpass_scraper.py` consulta Overpass API por ciudad y guarda JSON local
2. `importar_locales.py --all` lee esos JSON e inserta en D1 en lotes de 20

**Por qué los domingos:**
Es el día de menor tráfico. El scraper puede tardar 30-60 minutos en procesar las 63 ciudades.

---

### `generar_content_ciudades.sh` — Generador de contenido SEO
**Cron:** `0 6 * * *` (6:00, todos los días)
**Ruta:** `/root/scripts/generar_content_ciudades.sh`

**Qué hace:**
Detecta ciudades activas en D1 que no tienen contenido editorial en `ciudad-content.json` (intro, FAQs, barrios). Para cada una, llama a **Claude** (vía `claude -p`) para generar:
- `intro`: párrafo descriptivo sobre el tardeo en esa ciudad
- `faqs`: 5 preguntas frecuentes con respuestas (aparecen como schema.org FAQPage en Google)
- `barrios`: los 5 barrios más conocidos para el tardeo

---

### `sync_cities.sh` — Sincronizador de ciudades
**Cron:** `0 7 * * *` (7:00, todos los días)
**Ruta:** `/root/scripts/sync_cities.sh`

**Qué hace:**
Consulta D1 para obtener las ciudades con suficientes locales (umbral: ≥10 locales con dirección). Compara con `data/cities.json` y, si hay ciudades nuevas que cumplen el umbral, actualiza el JSON y lanza un build + deploy a Cloudflare Pages.

---

### `instagram_publisher.py` — Publicador de reels
**Cron:** `0 10,18 * * *` (10:00 y 18:00)
**Ruta:** `/root/scripts/instagram_publisher.py`

**Qué hace:**
Publica hasta 2 reels por día en Instagram (`@somos.tresycuarto`) desde una cola programada de vídeos MP4. Usa la **Meta Graph API** (Instagram Content Publishing).

**Flujo:**
1. Sube el vídeo creando un "contenedor" en Meta
2. Espera a que Meta procese el vídeo (polling cada 35s, máximo 15 intentos)
3. Publica cuando el estado es `FINISHED`
4. Guarda el estado en `instagram_state.json` para no repetir publicaciones

Cada caption incluye una llamada a la acción apuntando a tresycuarto.com vía link en bio.

---

### `monitor.py` — Monitor de servicios
**Cron:** `*/5 * * * *` (cada 5 minutos)
**Ruta:** `/root/scripts/monitor.py`

**Qué hace:**
Comprueba que los servicios críticos del servidor estén activos (Ollama, Open WebUI, ttyd). Si detecta que alguno ha caído, envía un email de alerta al admin vía Brevo.

---

## Estructura del proyecto

```
app/
  page.tsx                        # Landing — buscador de ciudades + suscripción
  locales/[ciudad]/
    page.tsx                      # SSG — generateStaticParams desde cities.json
    CiudadPage.tsx                # Client component — listado + mapa + filtros + eventos
    MapaLocales.tsx               # Mapa Leaflet (sin SSR)
  tardeo/[query]/
    page.tsx                      # 252 páginas SEO: "bares-en-madrid", "pubs-en-sevilla"...
  rutas/[slug]/
    page.tsx                      # Rutas de tardeo editoriales (Malasaña, La Latina, etc.)
  eventos/                        # Lista de eventos con locales cercanos expandibles
  local/                          # Panel privado de propietarios (login, dashboard, fotos, menú)
  para-locales/                   # Landing B2B para propietarios
  faq/ contacto/ privacidad/

functions/                        # Cloudflare Pages Functions (lógica de servidor)
  api/
    locales/index.js              # GET /api/locales — listado con filtros
    eventos/index.js              # GET /api/eventos
    eventos/[id]/locales.js       # GET — locales cercanos al evento
    subscribe/index.js            # POST — suscripción newsletter
    unsubscribe/index.js          # GET — baja newsletter
    admin/                        # Endpoints protegidos del panel admin
    local/                        # Auth + perfil + fotos + menú + stats del propietario
  locales/[id].js                 # Ficha pública del local (foto, rating, horario, mapa)
  sitemap.xml.js                  # Sitemap dinámico (~41.000 URLs)

data/
  cities.json                     # Ciudades publicadas (slug + nombre)
  ciudad-content.json             # Contenido SEO por ciudad (intro, barrios, FAQs, coords)
  rutas.json                      # 10 rutas de tardeo editoriales curadas

scripts/
  scraper_eventos.py              # Scraper API Turismo España
  geocodificar_eventos.py         # Geocodificador de eventos (Ollama + Nominatim)
  matching_eventos.py             # Matching geoespacial evento↔local (haversine)
  enviar_newsletter.py            # Newsletter diaria 15:15 (1 email/suscriptor/ciudad)
  enriquecedor.py                 # Enriquecedor de locales (Instagram + web)
  enriquecedor_loop.sh            # Ejecuta enriquecedor en loop continuo
  enriquecer_ratings.py           # Google Places API — fotos, ratings, horarios
  overpass_scraper.py             # Scraper locales OpenStreetMap
  importar_locales.py             # Importa locales OSM a D1
  instagram_generator.py          # Genera vídeos MP4 para reels (moviepy)

public/
  _routes.json                    # Excluye rutas de ciudad del CF Worker
```

---

## Páginas públicas

### `/locales/{ciudad}` — Página de ciudad
- Intro editorial + barrios del tardeo
- Filtros: Todos / Bar / Pub / Cafetería / Con terraza
- Mapa Leaflet interactivo con pines por tipo de local
- Próximos eventos con "Ver locales cercanos" (filtra el mapa por radio del evento)
- Rutas de tardeo curadas del barrio
- FAQs (schema.org FAQPage → Google "People Also Ask")
- Ciudades cercanas para descubrir más
- Paginación (25 locales/página)

### `/locales/{id}` — Ficha de local
- Foto de cabecera (Google Places)
- Valoración con estrellas + número de reseñas
- Badge de precio (€ / €€ / €€€)
- Badges: terraza ☀️, música 🎵
- Descripción editorial (Google)
- Horario por día de la semana
- Mapa OpenStreetMap embebido
- Schema.org `BarOrPub` con `aggregateRating`

### `/tardeo/{tipo}-en-{ciudad}` — SEO programático
252 páginas generadas en build: `bares-en-madrid`, `pubs-en-sevilla`, `cafeterias-en-barcelona`...
Cada página: grid filtrado + chips de ciudades cercanas + schema.org `CollectionPage`.

### `/rutas/{slug}` — Rutas de tardeo
10 rutas editoriales curadas (Madrid, Barcelona, Valencia, Sevilla) con:
- Timeline visual de paradas con tiempo a pie entre ellas
- Consejos del barrio
- Schema.org `ItemList` + `BreadcrumbList`

---

## Sistema de email

### Flujo completo

```
Suscriptor se apunta en tresycuarto.com
  → POST /api/subscribe
  → Se añade a Listmonk (lista 3) con atributo "ciudades": ["Madrid", "Sevilla"]
  → Email de bienvenida automático (template Listmonk #4)

Cada día a las 15:15:
  → enviar_newsletter.py consulta eventos aprobados para ese día
  → Para cada suscriptor: filtra por sus ciudades → máximo 5 eventos
  → UN email por suscriptor vía Brevo (si hay eventos en sus ciudades)

Cada vez que se añade una ciudad nueva al sistema:
  → notificar_ciudad_nueva.py detecta la novedad
  → Notifica a quien había pedido esa ciudad (template Listmonk #6)
```

### Providers de email

| Proveedor | Uso |
|-----------|-----|
| **Listmonk** (self-hosted) | Gestión de suscriptores, templates de bienvenida, base de datos de listas |
| **Brevo** (API REST) | Envío de transaccionales: newsletter, alertas admin, notificaciones |

---

## SEO

### Estrategia

| Tipo de página | Volumen | Schema.org |
|----------------|---------|------------|
| `/locales/{ciudad}` | 63 | CollectionPage + BreadcrumbList + FAQPage |
| `/tardeo/{tipo}-en-{ciudad}` | 252 | CollectionPage + BreadcrumbList |
| `/rutas/{slug}` | 10 | ItemList + BreadcrumbList |
| `/locales/{id}` | ~40.700 | BarOrPub + aggregateRating |
| Sitemap total | ~41.000 URLs | — |

### Resultados (marzo 2026)
- **6.800 impresiones** mensuales en Google (+114% vs mes anterior)
- **30 clicks** | CTR 0.44% | Posición media 14.7

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

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `CLOUDFLARE_API_TOKEN` | Deploy a Pages, consultas D1 desde scripts |
| `CLOUDFLARE_ACCOUNT_ID` | Identificador de cuenta Cloudflare |
| `ANTHROPIC_API_KEY` | Generación automática de contenido SEO con Claude |
| `GOOGLE_PLACES_API_KEY` | Fotos, ratings y horarios de locales |

---

## Diseño

| Color | Hex | Uso |
|-------|-----|-----|
| Crema | `#FFF8EF` | Fondo principal |
| Melocotón | `#FB923C` | Acento principal, CTAs |
| Dorado | `#F59E0B` | Degradados, badges |
| Lavanda | `#A78BFA` | Pills de ciudades y barrios |
| Oscuro | `#1C1917` | Texto principal, headers |

---

## URLs

| | URL |
|-|-----|
| Producción | https://tresycuarto.com |
| Cloudflare Pages | https://tresycuarto.pages.dev |
| Newsletter admin | https://listmonk.tresycuarto.com |

---

## Roadmap

- [x] SEO programático: 252 páginas `/tardeo/`
- [x] Schema.org completo en todas las páginas
- [x] Contenido editorial (intro + FAQs + barrios) en 63 ciudades
- [x] Sistema de eventos con matching geoespacial
- [x] Newsletter automática diaria por ciudad
- [x] Google Places: fotos, ratings, horarios en fichas de locales
- [x] Rutas de tardeo editoriales (10 rutas en 4 ciudades)
- [ ] Geolocalización "cerca de mí"
- [ ] Filtros pet-friendly / con niños (datos OSM disponibles)
- [ ] Canal Telegram/WhatsApp por ciudad
- [ ] Más rutas: Bilbao, Málaga, Granada, Zaragoza...
