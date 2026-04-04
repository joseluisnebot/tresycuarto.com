# tresycuarto.com — Guía de Estilo

> **REGLA ABSOLUTA**: Nunca modificar colores, tipografías, bordes, espaciados ni componentes visuales sin que el usuario lo solicite explícitamente. Cualquier cambio de funcionalidad debe preservar 100% el estilo existente.

---

## Paleta de colores

| Token | Hex | Uso |
|-------|-----|-----|
| Crema fondo | `#FFF8EF` | Background general de todas las páginas |
| Crema card | `#FEF0DC` | Background de badges tipo, hover states |
| Melocotón | `#FB923C` | Color principal: CTAs, links, badges tipo |
| Dorado | `#F59E0B` | Estrellas de rating |
| Lavanda | `#A78BFA` | Acciones secundarias (¿Eres el dueño?) |
| Texto principal | `#1C1917` | Títulos, nombres de locales |
| Texto secundario | `#78716C` | Subtítulos, metadata |
| Texto suave | `#A8A29E` | Fechas, contadores, horarios |
| Borde card | `#F5E6D3` | Bordes de tarjetas |
| Borde general | `#E7E5E4` | Bordes de elementos UI |

## Tipografía

- **Font**: `system-ui, sans-serif` — sin Google Fonts, sin imports externos
- **Peso títulos**: 700-800
- **Peso cuerpo**: 400-600
- **Tamaños usados**: 0.68rem (badges), 0.75rem (meta), 0.78-0.82rem (secondary), 0.9-0.95rem (body), 1rem (card title), 1.2rem (nav brand), 2rem (h1 ficha)

## Componentes

### Nav (todas las páginas)
- `background: #fff`, `border-bottom: 1px solid #e7e5e4`
- `height: 56px`, sticky top 0, z-index 50
- Brand "tresycuarto" fontWeight 800, color `#1C1917`
- Separador `/` color `#A8A29E`

### Tarjeta de local (CiudadPage)
- `background: white`, `border-radius: 1.25rem`, `border: 1px solid #F5E6D3`
- Hover: `box-shadow: 0 8px 24px rgba(0,0,0,0.08)`, `translateY(-2px)`
- Imagen: 140px altura, `object-fit: cover`
- Sin imagen: placeholder R2 por tipo (`/placeholders/bar.jpg`, `pub.jpg`, `cafe.jpg`, `biergarten.jpg`)
- Padding contenido: `1rem`

### Badge de tipo (tarjeta y ficha)
- `fontSize: 0.68rem`, `fontWeight: 700`, `letterSpacing: 0.08em`, `textTransform: uppercase`
- `color: #FB923C`, `background: #FEF0DC`, `padding: 0.25rem 0.6rem`, `borderRadius: 999px`

### Badges de atributos
| Atributo | Color texto | Background |
|----------|-------------|------------|
| ☀️ Terraza | `#059669` | `#D1FAE5` |
| 🎵 Música | `#7C3AED` | `#EDE9FE` |
| 👥 Para grupos | `#0369A1` | `#E0F2FE` |
| 🐾 Pet-friendly | `#92400E` | `#FEF3C7` |

### Ficha de local (LocalDetalle)
- Hero: `height: 280px`, `border-radius: 12px`
- Sin foto: gradiente `linear-gradient(135deg, #FEF0DC 0%, #FFF8EF 50%, #EDE9FE 100%)` + emoji según tipo
- Info cards: `background: #fff`, `border: 1px solid #e7e5e4`, `border-radius: 10px`, `padding: 1rem 1.25rem`
- CTA reclamar: `border: 1.5px dashed #F59E0B`, `border-radius: 14px`
- CTA verificado: `background: #F0FDF4`, `border: 1.5px solid #86EFAC`

### Botón CTA principal
- `background: #FB923C`, `color: #fff`, `border-radius: 999px`
- `padding: 0.55rem 1.4rem`, `fontWeight: 700`, `fontSize: 0.875rem`

### Botón Cómo llegar (tarjeta)
- `color: #FB923C`, inline-flex, `fontSize: 0.75rem`, `fontWeight: 600`

## Gradientes

- **Hero landing**: `#FFF8EF → #FEF0DC`
- **Hero placeholder ficha**: `135deg, #FEF0DC → #FFF8EF → #EDE9FE`
- **Fondo crema general**: `#FFF8EF`

## Layout

- **Max width contenido**: `800px` (fichas), variable con grid (listado)
- **Grid tarjetas**: `repeat(auto-fill, minmax(260px, 1fr))`, `gap: 1rem`
- **Padding página**: `2rem 1rem`

## Lo que NUNCA debe cambiar sin pedirlo explícitamente

1. La paleta de colores — especialmente `#FB923C` (melocotón) y `#FFF8EF` (crema)
2. El border-radius de tarjetas (`1.25rem`) y fichas (`12px`)
3. La tipografía `system-ui` — nunca añadir Google Fonts
4. El hover effect de tarjetas (shadow + translateY)
5. El sticky nav con height 56px
6. Los colores de badges por atributo
