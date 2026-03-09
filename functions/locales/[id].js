function tipoLabel(tipo) {
  const map = { bar: "Bar", cafe: "Cafetería", pub: "Pub", biergarten: "Terraza" };
  return map[tipo] || "Local";
}

function renderHtml(local) {
  const title = `${local.nombre} — Tardeo en ${local.ciudad} | tresycuarto`;
  const desc = [
    `${tipoLabel(local.tipo)} en ${local.ciudad}.`,
    local.direccion ? `${local.direccion}.` : "",
    local.terraza ? "Con terraza." : "",
    local.horario ? `Horario: ${local.horario}.` : "",
    `Descubre los mejores locales de tardeo en ${local.ciudad} en tresycuarto.`,
  ].filter(Boolean).join(" ");

  const mapsUrl = local.lat && local.lon
    ? `https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lon}#map=17/${local.lat}/${local.lon}`
    : null;

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    name: local.nombre,
    address: local.direccion ? {
      "@type": "PostalAddress",
      streetAddress: local.direccion,
      postalCode: local.codigo_postal,
      addressLocality: local.ciudad,
      addressCountry: "ES",
    } : undefined,
    telephone: local.telefono || undefined,
    url: local.web || undefined,
    openingHours: local.horario || undefined,
    geo: local.lat ? {
      "@type": "GeoCoordinates",
      latitude: local.lat,
      longitude: local.lon,
    } : undefined,
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(desc)}" />
  <meta property="og:title" content="${escHtml(local.nombre)}" />
  <meta property="og:description" content="${escHtml(desc)}" />
  <meta property="og:type" content="place" />
  <meta property="og:site_name" content="tresycuarto" />
  <link rel="canonical" href="https://tresycuarto.com/locales/${local.id}" />
  <script type="application/ld+json">${schema}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #FFF8EF; color: #1C1917; min-height: 100vh; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #F5E6D3; background: rgba(255,248,239,0.95); position: sticky; top: 0; backdrop-filter: blur(8px); }
    nav a { text-decoration: none; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.03em; color: #1C1917; }
    nav a span { color: #FB923C; }
    .container { max-width: 680px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    .badge { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #FB923C; background: #FEF0DC; padding: 0.3rem 0.8rem; border-radius: 999px; margin-bottom: 1rem; }
    h1 { font-size: clamp(1.8rem, 5vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 0.5rem; }
    .ciudad { color: #A78BFA; font-weight: 600; font-size: 1rem; margin-bottom: 2rem; }
    .card { background: white; border-radius: 1.25rem; border: 1px solid #F5E6D3; padding: 1.75rem; margin-bottom: 1rem; }
    .row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #FEF0DC; }
    .row:last-child { border-bottom: none; }
    .icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
    .label { font-size: 0.75rem; color: #78716C; text-transform: uppercase; letter-spacing: 0.06em; }
    .value { font-size: 0.95rem; color: #1C1917; font-weight: 500; }
    a.value { color: #FB923C; text-decoration: none; }
    a.value:hover { text-decoration: underline; }
    .back { display: inline-flex; align-items: center; gap: 0.4rem; color: #78716C; font-size: 0.875rem; text-decoration: none; margin-top: 2rem; }
    .back:hover { color: #FB923C; }
    footer { text-align: center; padding: 2rem 1rem; font-size: 0.8rem; color: #A8A29E; border-top: 1px solid #F5E6D3; margin-top: 2rem; }
  </style>
</head>
<body>
  <nav>
    <a href="/"><span>tres</span><span style="color:#FB923C">y</span><span>cuarto</span></a>
    <span style="font-size:0.7rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#FB923C;background:#FEF0DC;padding:0.25rem 0.75rem;border-radius:999px">Tardeo</span>
  </nav>

  <div class="container">
    <div class="badge">${escHtml(tipoLabel(local.tipo))}</div>
    <h1>${escHtml(local.nombre)}</h1>
    <div class="ciudad">📍 ${escHtml(local.ciudad)}</div>

    <div class="card">
      ${local.direccion ? `
      <div class="row">
        <span class="icon">🗺️</span>
        <div>
          <div class="label">Dirección</div>
          <div class="value">${escHtml(local.direccion)}${local.codigo_postal ? `, ${escHtml(local.codigo_postal)}` : ""}</div>
        </div>
      </div>` : ""}

      ${local.horario ? `
      <div class="row">
        <span class="icon">🕒</span>
        <div>
          <div class="label">Horario</div>
          <div class="value">${escHtml(local.horario)}</div>
        </div>
      </div>` : ""}

      ${local.telefono ? `
      <div class="row">
        <span class="icon">📞</span>
        <div>
          <div class="label">Teléfono</div>
          <a class="value" href="tel:${escHtml(local.telefono)}">${escHtml(local.telefono)}</a>
        </div>
      </div>` : ""}

      ${local.terraza ? `
      <div class="row">
        <span class="icon">☀️</span>
        <div>
          <div class="label">Terraza</div>
          <div class="value">Sí, tiene terraza</div>
        </div>
      </div>` : ""}

      ${local.web ? `
      <div class="row">
        <span class="icon">🌐</span>
        <div>
          <div class="label">Web</div>
          <a class="value" href="${escHtml(local.web)}" target="_blank" rel="noopener">${escHtml(local.web.replace(/^https?:\/\//, ""))}</a>
        </div>
      </div>` : ""}

      ${local.instagram ? `
      <div class="row">
        <span class="icon">📸</span>
        <div>
          <div class="label">Instagram</div>
          <a class="value" href="https://instagram.com/${escHtml(local.instagram)}" target="_blank" rel="noopener">@${escHtml(local.instagram)}</a>
        </div>
      </div>` : ""}

      ${local.lat && local.lon ? `
      <div class="row">
        <span class="icon">🧭</span>
        <div>
          <div class="label">Cómo llegar</div>
          <a class="value" href="https://maps.google.com/maps?daddr=${local.lat},${local.lon}" target="_blank" rel="noopener">Abrir navegación</a>
        </div>
      </div>` : ""}

    </div>

    ${local.lat && local.lon ? `
    <div style="margin-top:1rem;border-radius:1.25rem;overflow:hidden;border:1px solid #F5E6D3">
      <iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=${local.lon - 0.005},${local.lat - 0.005},${local.lon + 0.005},${local.lat + 0.005}&layer=mapnik&marker=${local.lat},${local.lon}"
        style="width:100%;height:280px;border:none;display:block"
        loading="lazy"
        title="Mapa de ${escHtml(local.nombre)}"
      ></iframe>
    </div>` : ""}

    <a href="/locales?ciudad=${encodeURIComponent(local.ciudad)}" class="back">← Más locales en ${escHtml(local.ciudad)}</a>
  </div>

  <footer>© 2025 tresycuarto.com — Los mejores locales de tardeo en España</footer>
</body>
</html>`;
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  const { results } = await env.DB.prepare(
    "SELECT * FROM locales WHERE id = ? LIMIT 1"
  ).bind(id).all();

  if (!results.length) {
    return new Response("Local no encontrado", { status: 404 });
  }

  return new Response(renderHtml(results[0]), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
