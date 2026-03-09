export async function onRequestGet(context) {
  const { env, params } = context;
  const slug = params.slug;

  // Buscar en usuario_locales (nuevo schema)
  const { results: ulRows } = await env.DB.prepare(
    "SELECT local_id, slug FROM usuario_locales WHERE slug = ?"
  ).bind(slug).all();

  if (!ulRows.length) {
    // No es un slug de local — servir página estática de Next.js si existe
    return env.ASSETS.fetch(context.request);
  }

  const ul = ulRows[0];
  const { results } = await env.DB.prepare(
    "SELECT nombre, tipo, ciudad, direccion, telefono, web, instagram, horario, terraza, musica, descripcion, foto_perfil, fotos, menu_url, redes FROM locales WHERE id = ?"
  ).bind(ul.local_id).all();

  if (!results.length) {
    return new Response(notFoundHtml(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const local = results[0];
  const fotos = local.fotos ? JSON.parse(local.fotos) : [];

  const hoy = new Date().toISOString().slice(0, 10);
  const { results: eventoRows } = await env.DB.prepare(
    "SELECT titulo, descripcion, fecha, hora_inicio, hora_fin, precio, enlace FROM eventos WHERE local_id = ? AND fecha >= ? ORDER BY fecha ASC, hora_inicio ASC LIMIT 5"
  ).bind(ul.local_id, hoy).all();

  const html = buildHtml(local, ul.slug, fotos, eventoRows);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
}

function buildHtml(local, slug, fotos = [], eventos = []) {
  const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const links = [];

  if (local.menu_url) {
    links.push({ icon: "🍽️", label: "Ver carta", url: local.menu_url });
  }

  // Redes sociales (redes JSON + backward compat con instagram column)
  const REDES_META = {
    instagram: { icon: "📸", label: h => `@${h}`, url: h => `https://instagram.com/${h}` },
    tiktok:    { icon: "🎵", label: h => `@${h}`, url: h => `https://tiktok.com/@${h}` },
    facebook:  { icon: "👥", label: h => h,        url: h => `https://facebook.com/${h}` },
    x:         { icon: "𝕏",  label: h => `@${h}`, url: h => `https://x.com/${h}` },
    youtube:   { icon: "▶️", label: h => `@${h}`, url: h => `https://youtube.com/@${h}` },
    whatsapp:  { icon: "💬", label: h => `WhatsApp · ${h}`, url: h => `https://wa.me/${h.replace(/\D/g, "")}` },
  };
  const redesArr = [];
  if (local.redes) { try { redesArr.push(...JSON.parse(local.redes)); } catch {} }
  if (local.instagram && !redesArr.find(r => r.red === "instagram")) {
    const h = local.instagram.replace(/^@/, "").replace(/.*instagram\.com\//, "").replace(/\/$/, "");
    if (h) redesArr.push({ red: "instagram", valor: h });
  }
  for (const { red, valor } of redesArr) {
    const meta = REDES_META[red];
    if (meta && valor) links.push({ icon: meta.icon, label: meta.label(valor), url: meta.url(valor) });
  }

  if (local.web) {
    const webUrl = local.web.startsWith("http") ? local.web : `https://${local.web}`;
    const domain = webUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    links.push({ icon: "🌐", label: `https://${domain}`, url: webUrl });
  }
  if (local.telefono) {
    links.push({ icon: "📞", label: `Llamar · ${local.telefono}`, url: `tel:${local.telefono}` });
  }

  const linksHtml = links.map(l => `
    <a href="${esc(l.url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:0.75rem;padding:1rem 1.25rem;background:white;border-radius:1rem;border:1.5px solid #F5E6D3;text-decoration:none;color:#1C1917;font-size:0.95rem;font-weight:600;transition:transform 0.1s;box-shadow:0 1px 4px rgba(0,0,0,0.06);" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
      <span style="font-size:1.3rem">${l.icon}</span>
      <span style="flex:1">${esc(l.label)}</span>
      <span style="color:#A8A29E;font-size:0.8rem">→</span>
    </a>`).join("\n");

  const badges = [];
  if (local.terraza) badges.push('<span style="background:#D1FAE5;color:#059669;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600">☀️ Terraza</span>');
  if (local.musica) badges.push('<span style="background:#EDE9FE;color:#7C3AED;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600">🎵 Música</span>');

  const fotoHtml = local.foto_perfil
    ? `<img src="${esc(local.foto_perfil)}" alt="${esc(local.nombre)}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.15);margin-bottom:0.75rem;">`
    : `<div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#FB923C,#F59E0B);display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin:0 auto 0.75rem;box-shadow:0 2px 12px rgba(0,0,0,0.15);">🍹</div>`;

  const horarioHtml = local.horario ? `<p style="font-size:0.8rem;color:#A8A29E;margin:0.25rem 0 0">🕒 ${esc(local.horario)}</p>` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(local.nombre)} · tresycuarto</title>
  <meta name="description" content="${local.descripcion ? esc(local.descripcion) : `${esc(local.nombre)} en ${esc(local.ciudad)} — ${esc(local.tipo || "local")}`}">
  <meta property="og:title" content="${esc(local.nombre)}">
  <meta property="og:description" content="${local.descripcion ? esc(local.descripcion) : `${esc(local.tipo || "Bar")} en ${esc(local.ciudad)}`}">
  <meta property="og:type" content="website">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Geist', system-ui, sans-serif; background: linear-gradient(160deg, #FFF8EF 0%, #FEF0DC 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem 4rem; }
  </style>
</head>
<body>
  <div style="width:100%;max-width:480px;display:flex;flex-direction:column;align-items:center;gap:1.25rem;">

    <!-- Header local -->
    <div style="text-align:center;padding-top:1rem;">
      ${fotoHtml}
      <h1 style="font-size:1.5rem;font-weight:800;color:#1C1917;line-height:1.2">${esc(local.nombre)}</h1>
      <p style="font-size:0.85rem;color:#78716C;margin-top:0.3rem">${esc(local.tipo || "Bar")} · ${esc(local.ciudad)}</p>
      ${local.direccion ? `<p style="font-size:0.78rem;color:#A8A29E;margin-top:0.2rem">📍 ${esc(local.direccion)}</p>` : ""}
      ${horarioHtml}
      ${badges.length ? `<div style="display:flex;gap:0.4rem;justify-content:center;flex-wrap:wrap;margin-top:0.6rem">${badges.join("")}</div>` : ""}
      ${local.descripcion ? `<p style="font-size:0.9rem;color:#57534E;margin-top:0.75rem;line-height:1.55;max-width:360px">${esc(local.descripcion)}</p>` : ""}
    </div>

    <!-- Links -->
    <div style="width:100%;display:flex;flex-direction:column;gap:0.65rem;">
      ${linksHtml || '<p style="text-align:center;color:#A8A29E;font-size:0.85rem">Próximamente más enlaces</p>'}
    </div>

    ${fotos.length > 0 ? `
    <!-- Galería -->
    <div style="width:100%">
      <h2 style="font-size:0.85rem;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem">Fotos</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.4rem;border-radius:0.75rem;overflow:hidden;">
        ${fotos.map(f => `<img src="${esc(f)}" alt="${esc(local.nombre)}" style="width:100%;aspect-ratio:1;object-fit:cover;">`).join("")}
      </div>
    </div>` : ""}

    ${eventos.length > 0 ? `
    <!-- Eventos -->
    <div style="width:100%">
      <h2 style="font-size:0.85rem;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem">Próximos eventos</h2>
      <div style="display:flex;flex-direction:column;gap:0.5rem;">
        ${eventos.map(e => {
          const fecha = new Date(e.fecha + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
          return `<div style="background:white;border-radius:0.75rem;padding:0.9rem 1rem;border:1.5px solid #F5E6D3;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
              <div>
                <p style="font-size:0.95rem;font-weight:700;color:#1C1917">${esc(e.titulo)}</p>
                ${e.descripcion ? `<p style="font-size:0.8rem;color:#78716C;margin-top:0.25rem">${esc(e.descripcion)}</p>` : ""}
                ${e.enlace ? `<a href="${esc(e.enlace)}" target="_blank" rel="noopener" style="font-size:0.8rem;color:#0EA5E9;margin-top:0.25rem;display:inline-block;font-weight:600">🔗 Más info</a>` : ""}
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <p style="font-size:0.78rem;font-weight:600;color:#FB923C;white-space:nowrap">📅 ${fecha}</p>
                ${e.hora_inicio ? `<p style="font-size:0.75rem;color:#A8A29E">🕒 ${esc(e.hora_inicio)}${e.hora_fin ? `–${esc(e.hora_fin)}` : ""}</p>` : ""}
                ${e.precio ? `<p style="font-size:0.75rem;color:#059669;font-weight:600">💶 ${esc(e.precio)}</p>` : ""}
              </div>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>` : ""}

    <!-- Footer tresycuarto -->
    <div style="margin-top:1.5rem;text-align:center;">
      <a href="https://tresycuarto.com" style="font-size:0.8rem;color:#A8A29E;text-decoration:none;font-weight:600">
        tres<span style="color:#FB923C">y</span>cuarto
      </a>
      <p style="font-size:0.7rem;color:#C7BDB5;margin-top:0.2rem">El tardeo en España</p>
    </div>

  </div>
</body>
</html>`;
}

function notFoundHtml() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>No encontrado · tresycuarto</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FFF8EF;"><div style="text-align:center"><p style="font-size:3rem">🍹</p><h1 style="color:#1C1917">Local no encontrado</h1><a href="https://tresycuarto.com" style="color:#FB923C">Volver a tresycuarto</a></div></body></html>`;
}
