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
    links.push({ icon: "🍽️", label: "Ver carta", url: local.menu_url, accent: "#FB923C" });
  }

  const REDES_META = {
    instagram: { icon: "📸", label: h => `@${h}`, url: h => `https://instagram.com/${h}`, accent: "#E1306C" },
    tiktok:    { icon: "🎵", label: h => `@${h}`, url: h => `https://tiktok.com/@${h}`,  accent: "#010101" },
    facebook:  { icon: "👥", label: h => h,        url: h => `https://facebook.com/${h}`, accent: "#1877F2" },
    x:         { icon: "𝕏",  label: h => `@${h}`, url: h => `https://x.com/${h}`,        accent: "#000000" },
    youtube:   { icon: "▶️", label: h => `@${h}`, url: h => `https://youtube.com/@${h}`, accent: "#FF0000" },
    whatsapp:  { icon: "💬", label: h => `WhatsApp · ${h}`, url: h => `https://wa.me/${h.replace(/\D/g, "")}`, accent: "#25D366" },
  };
  const redesArr = [];
  if (local.redes) { try { redesArr.push(...JSON.parse(local.redes)); } catch {} }
  if (local.instagram && !redesArr.find(r => r.red === "instagram")) {
    const h = local.instagram.replace(/^@/, "").replace(/.*instagram\.com\//, "").replace(/\/$/, "");
    if (h) redesArr.push({ red: "instagram", valor: h });
  }
  for (const { red, valor } of redesArr) {
    const meta = REDES_META[red];
    if (meta && valor) links.push({ icon: meta.icon, label: meta.label(valor), url: meta.url(valor), accent: meta.accent });
  }
  if (local.web) {
    const webUrl = local.web.startsWith("http") ? local.web : `https://${local.web}`;
    const domain = webUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    links.push({ icon: "🌐", label: domain, url: webUrl, accent: "#0EA5E9" });
  }
  if (local.telefono) {
    links.push({ icon: "📞", label: `Llamar · ${local.telefono}`, url: `tel:${local.telefono}`, accent: "#10B981" });
  }

  const linksHtml = links.map(l => `
    <a href="${esc(l.url)}" target="_blank" rel="noopener" class="link-btn" style="--accent:${l.accent || "#FB923C"}">
      <span class="link-icon">${l.icon}</span>
      <span class="link-label">${esc(l.label)}</span>
      <span class="link-arrow">→</span>
    </a>`).join("\n");

  const badges = [];
  if (local.terraza) badges.push('<span class="badge badge-terraza">☀️ Terraza</span>');
  if (local.musica)  badges.push('<span class="badge badge-musica">🎵 Música en vivo</span>');

  const avatarHtml = local.foto_perfil
    ? `<img src="${esc(local.foto_perfil)}" alt="${esc(local.nombre)}" class="avatar">`
    : `<div class="avatar avatar-placeholder">🍹</div>`;

  const fotosHtml = fotos.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Fotos</h2>
      <div class="gallery">
        ${fotos.map((f, i) => `<div class="gallery-item" style="animation-delay:${i * 0.05}s"><img src="${esc(f)}" alt="${esc(local.nombre)} foto ${i+1}" loading="lazy"></div>`).join("")}
      </div>
    </section>` : "";

  const eventosHtml = eventos.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Próximos eventos</h2>
      <div class="events">
        ${eventos.map(e => {
          const d = new Date(e.fecha + "T12:00:00");
          const dia  = d.toLocaleDateString("es-ES", { day: "numeric" });
          const mes  = d.toLocaleDateString("es-ES", { month: "short" }).toUpperCase();
          return `<div class="event-card">
            <div class="event-date"><span class="event-day">${dia}</span><span class="event-month">${mes}</span></div>
            <div class="event-body">
              <p class="event-title">${esc(e.titulo)}</p>
              ${e.descripcion ? `<p class="event-desc">${esc(e.descripcion)}</p>` : ""}
              <div class="event-meta">
                ${e.hora_inicio ? `<span>🕒 ${esc(e.hora_inicio)}${e.hora_fin ? `–${esc(e.hora_fin)}` : ""}</span>` : ""}
                ${e.precio ? `<span class="event-precio">${esc(e.precio)}</span>` : ""}
              </div>
              ${e.enlace ? `<a href="${esc(e.enlace)}" target="_blank" rel="noopener" class="event-link">Más info →</a>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </section>` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(local.nombre)} · tresycuarto</title>
  <meta name="description" content="${local.descripcion ? esc(local.descripcion) : `${esc(local.nombre)} en ${esc(local.ciudad)} — ${esc(local.tipo || "Bar")}`}">
  <meta property="og:title" content="${esc(local.nombre)} · ${esc(local.ciudad)}">
  <meta property="og:description" content="${local.descripcion ? esc(local.descripcion) : `${esc(local.tipo || "Bar")} en ${esc(local.ciudad)}`}">
  <meta property="og:type" content="website">
  ${local.foto_perfil ? `<meta property="og:image" content="${esc(local.foto_perfil)}">` : ""}
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Geist', system-ui, sans-serif;
      background: #FFF8EF;
      min-height: 100vh;
      color: #1C1917;
    }

    /* Hero */
    .hero {
      width: 100%;
      background: linear-gradient(160deg, #FB923C 0%, #F59E0B 100%);
      padding: 3rem 1.5rem 5rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.18) 0%, transparent 60%),
                  radial-gradient(ellipse at 80% 80%, rgba(0,0,0,0.08) 0%, transparent 60%);
    }
    .hero::after {
      content: "";
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 60px;
      background: #FFF8EF;
      clip-path: ellipse(55% 100% at 50% 100%);
    }

    .avatar {
      width: 110px; height: 110px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid white;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      position: relative;
      z-index: 1;
      animation: fadeUp 0.4s ease both;
    }
    .avatar-placeholder {
      width: 110px; height: 110px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      border: 4px solid rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center;
      font-size: 3rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      position: relative; z-index: 1;
      margin: 0 auto;
      animation: fadeUp 0.4s ease both;
    }

    .hero-name {
      font-size: 1.75rem; font-weight: 900;
      color: white;
      margin-top: 0.9rem;
      line-height: 1.15;
      text-shadow: 0 1px 8px rgba(0,0,0,0.12);
      position: relative; z-index: 1;
      animation: fadeUp 0.4s 0.05s ease both;
    }
    .hero-sub {
      font-size: 0.9rem; color: rgba(255,255,255,0.85);
      margin-top: 0.3rem; font-weight: 500;
      position: relative; z-index: 1;
      animation: fadeUp 0.4s 0.1s ease both;
    }
    .hero-badges {
      display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;
      margin-top: 0.85rem;
      position: relative; z-index: 1;
      animation: fadeUp 0.4s 0.15s ease both;
    }
    .badge {
      font-size: 0.75rem; font-weight: 700;
      padding: 0.3rem 0.85rem; border-radius: 999px;
      backdrop-filter: blur(4px);
    }
    .badge-terraza { background: rgba(255,255,255,0.25); color: white; border: 1px solid rgba(255,255,255,0.4); }
    .badge-musica  { background: rgba(167,139,250,0.35); color: white; border: 1px solid rgba(167,139,250,0.5); }

    /* Layout */
    .page {
      max-width: 480px;
      margin: 0 auto;
      padding: 0 1rem 4rem;
      display: flex; flex-direction: column; gap: 0;
    }

    /* Info strip */
    .info-strip {
      background: white;
      border-radius: 1.25rem;
      border: 1px solid #F5E6D3;
      padding: 1rem 1.25rem;
      margin-top: -2rem;
      position: relative; z-index: 2;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      animation: fadeUp 0.4s 0.2s ease both;
    }
    .info-row {
      display: flex; align-items: flex-start; gap: 0.6rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #FEF0DC;
      font-size: 0.875rem;
    }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-row:first-child { padding-top: 0; }
    .info-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
    .info-text { color: #44403C; line-height: 1.5; }

    /* Descripción */
    .descripcion {
      font-size: 0.9rem; color: #57534E;
      line-height: 1.65; font-style: italic;
      text-align: center;
      padding: 1.25rem 0.5rem 0.25rem;
      animation: fadeUp 0.4s 0.25s ease both;
    }

    /* Links */
    .links {
      display: flex; flex-direction: column; gap: 0.6rem;
      padding-top: 1.25rem;
    }
    .link-btn {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.95rem 1.1rem;
      background: white;
      border-radius: 1rem;
      border: 1.5px solid #F5E6D3;
      text-decoration: none;
      color: #1C1917;
      font-weight: 600;
      font-size: 0.95rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
      animation: fadeUp 0.35s ease both;
    }
    .link-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
      border-color: var(--accent);
    }
    .link-icon {
      font-size: 1.25rem;
      width: 2.2rem; height: 2.2rem;
      display: flex; align-items: center; justify-content: center;
      background: #FEF0DC;
      border-radius: 0.6rem;
      flex-shrink: 0;
    }
    .link-label { flex: 1; }
    .link-arrow { color: #D4C5B4; font-size: 0.85rem; transition: color 0.15s, transform 0.15s; }
    .link-btn:hover .link-arrow { color: var(--accent); transform: translateX(2px); }

    /* Sections */
    .section { padding-top: 1.75rem; }
    .section-title {
      font-size: 0.7rem; font-weight: 700;
      color: #A8A29E;
      text-transform: uppercase; letter-spacing: 0.1em;
      margin-bottom: 0.85rem;
    }

    /* Gallery */
    .gallery {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
    }
    .gallery-item {
      border-radius: 0.875rem; overflow: hidden;
      aspect-ratio: 1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      animation: fadeUp 0.35s ease both;
    }
    .gallery-item img {
      width: 100%; height: 100%; object-fit: cover;
      transition: transform 0.3s;
    }
    .gallery-item:hover img { transform: scale(1.05); }

    /* Events */
    .events { display: flex; flex-direction: column; gap: 0.6rem; }
    .event-card {
      display: flex; gap: 1rem; align-items: flex-start;
      background: white;
      border-radius: 1rem;
      border: 1.5px solid #F5E6D3;
      padding: 0.9rem 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      animation: fadeUp 0.35s ease both;
    }
    .event-date {
      display: flex; flex-direction: column; align-items: center;
      background: linear-gradient(135deg, #FB923C, #F59E0B);
      border-radius: 0.75rem;
      padding: 0.5rem 0.7rem;
      min-width: 48px; flex-shrink: 0;
    }
    .event-day { font-size: 1.3rem; font-weight: 900; color: white; line-height: 1; }
    .event-month { font-size: 0.6rem; font-weight: 700; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
    .event-body { flex: 1; min-width: 0; }
    .event-title { font-size: 0.95rem; font-weight: 700; color: #1C1917; }
    .event-desc { font-size: 0.8rem; color: #78716C; margin-top: 0.2rem; line-height: 1.45; }
    .event-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.4rem; font-size: 0.75rem; color: #A8A29E; }
    .event-precio { color: #059669; font-weight: 600; }
    .event-link { display: inline-block; margin-top: 0.4rem; font-size: 0.78rem; color: #FB923C; font-weight: 700; text-decoration: none; }
    .event-link:hover { text-decoration: underline; }

    /* Footer */
    .footer {
      text-align: center;
      padding-top: 2.5rem;
      animation: fadeUp 0.4s 0.3s ease both;
    }
    .footer a {
      font-size: 0.82rem; font-weight: 700;
      color: #C7BDB5; text-decoration: none;
      letter-spacing: 0.01em;
    }
    .footer a span { color: #FB923C; }
    .footer p { font-size: 0.7rem; color: #D4C5B4; margin-top: 0.2rem; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

  <!-- Hero -->
  <div class="hero">
    ${avatarHtml}
    <h1 class="hero-name">${esc(local.nombre)}</h1>
    <p class="hero-sub">${esc(local.tipo || "Bar")} · ${esc(local.ciudad)}</p>
    ${badges.length ? `<div class="hero-badges">${badges.join("")}</div>` : ""}
  </div>

  <div class="page">

    <!-- Info strip -->
    <div class="info-strip">
      ${local.direccion ? `<div class="info-row"><span class="info-icon">📍</span><span class="info-text">${esc(local.direccion)}</span></div>` : ""}
      ${local.horario   ? `<div class="info-row"><span class="info-icon">🕒</span><span class="info-text">${esc(local.horario)}</span></div>` : ""}
    </div>

    ${(local.descripcion) ? `<p class="descripcion">${esc(local.descripcion)}</p>` : ""}

    <!-- Links -->
    ${links.length > 0 ? `<div class="links">${linksHtml}</div>` : ""}

    <!-- Galería -->
    ${fotosHtml}

    <!-- Eventos -->
    ${eventosHtml}

    <!-- Footer -->
    <div class="footer">
      <a href="https://tresycuarto.com">tres<span>y</span>cuarto</a>
      <p>El tardeo en España</p>
    </div>

  </div>
</body>
</html>`;
}

function notFoundHtml() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>No encontrado · tresycuarto</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FFF8EF;"><div style="text-align:center"><p style="font-size:3rem">🍹</p><h1 style="color:#1C1917">Local no encontrado</h1><a href="https://tresycuarto.com" style="color:#FB923C">Volver a tresycuarto</a></div></body></html>`;
}
