export async function onRequestGet(context) {
  const { env, params, request } = context;
  const slug = params.slug;

  const { results: ulRows } = await env.DB.prepare(
    "SELECT local_id, slug, theme FROM usuario_locales WHERE slug = ?"
  ).bind(slug).all();

  if (!ulRows.length) {
    return env.ASSETS.fetch(request);
  }

  const ul = ulRows[0];
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, tipo, ciudad, direccion, telefono, web, instagram, horario, terraza, musica, descripcion, foto_perfil, fotos, menu_url, redes, lat, lon, rating FROM locales WHERE id = ?"
  ).bind(ul.local_id).all();

  if (!results.length) {
    return new Response(notFoundHtml(slug), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const local = results[0];
  const DEFAULT_THEME = { color: "naranja", template: "fresh", sections: ["galeria", "eventos", "mapa"] };
  let theme = { ...DEFAULT_THEME };
  if (ul.theme) { try { theme = { ...DEFAULT_THEME, ...JSON.parse(ul.theme) }; } catch {} }
  const ALIAS = { minimalista: "bold", completo: "fresh", restaurante: "elegante" };
  if (ALIAS[theme.template]) theme.template = ALIAS[theme.template];

  const fotos = (() => { try { return JSON.parse(local.fotos || "[]"); } catch { return []; } })();
  const redesArr = (() => { try { return JSON.parse(local.redes || "[]"); } catch { return []; } })();

  const hoy = new Date().toISOString().slice(0, 10);
  const { results: eventos } = await env.DB.prepare(
    "SELECT titulo, descripcion, fecha, hora_inicio, hora_fin, precio, enlace FROM eventos WHERE local_id = ? AND fecha >= ? ORDER BY fecha ASC LIMIT 6"
  ).bind(local.id, hoy).all();

  const paleta = PALETAS[theme.color] || PALETAS.naranja;
  const tpl = theme.template || "fresh";
  const sections = theme.sections || DEFAULT_THEME.sections;

  const html = tpl === "bold"     ? buildBold(local, fotos, redesArr, eventos, paleta, sections)
             : tpl === "elegante" ? buildElegante(local, fotos, redesArr, eventos, paleta, sections)
             : buildFresh(local, fotos, redesArr, eventos, paleta, sections);

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" } });
}

// ── Constantes ────────────────────────────────────────────────────────────────

const PALETAS = {
  naranja: { primary: "#FB923C", light: "#FFF8EF", soft: "#FEF0DC", text: "#1C1917", textMuted: "#78716C" },
  dorado:  { primary: "#F59E0B", light: "#FFFBEB", soft: "#FEF3C7", text: "#1C1917", textMuted: "#78716C" },
  verde:   { primary: "#10B981", light: "#F0FDF4", soft: "#DCFCE7", text: "#1C1917", textMuted: "#78716C" },
  azul:    { primary: "#3B82F6", light: "#EFF6FF", soft: "#DBEAFE", text: "#1C1917", textMuted: "#78716C" },
  morado:  { primary: "#8B5CF6", light: "#F5F3FF", soft: "#EDE9FE", text: "#1C1917", textMuted: "#78716C" },
  rosa:    { primary: "#EC4899", light: "#FDF2F8", soft: "#FCE7F3", text: "#1C1917", textMuted: "#78716C" },
  rojo:    { primary: "#EF4444", light: "#FEF2F2", soft: "#FEE2E2", text: "#1C1917", textMuted: "#78716C" },
  oscuro:  { primary: "#F97316", light: "#0D1117", soft: "#161B22", text: "#F8FAFC",  textMuted: "#94A3B8" },
};

const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT_GEIST = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800;900&display=swap" rel="stylesheet">`;
const FONT_PLAYFAIR = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;
const LEAFLET = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMeta(local) {
  const desc = local.descripcion || `${local.tipo || "Bar"} en ${local.ciudad}`;
  return `
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(local.nombre)} · ${esc(local.ciudad)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(local.nombre)} · ${esc(local.ciudad)}">
  <meta property="og:description" content="${esc(desc)}">
  ${local.foto_perfil ? `<meta property="og:image" content="${esc(local.foto_perfil)}">` : ""}
  <meta property="og:type" content="website">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">`;
}

function getLinks(local, redesArr) {
  const links = [];
  if (local.menu_url) links.push({ icon: "🍽️", label: "Ver carta", url: local.menu_url, cta: true });
  const REDES = {
    instagram: { icon: "📸", label: h => `@${h}`, url: h => `https://instagram.com/${h}` },
    tiktok:    { icon: "🎵", label: h => `@${h}`, url: h => `https://tiktok.com/@${h}` },
    facebook:  { icon: "👥", label: h => h,        url: h => `https://facebook.com/${h}` },
    x:         { icon: "𝕏",  label: h => `@${h}`, url: h => `https://x.com/${h}` },
    youtube:   { icon: "▶️", label: h => `@${h}`, url: h => `https://youtube.com/@${h}` },
    whatsapp:  { icon: "💬", label: h => `WhatsApp ${h}`, url: h => `https://wa.me/${h.replace(/\D/g,"")}` },
  };
  for (const { red, valor } of redesArr) {
    const m = REDES[red]; if (m && valor) links.push({ icon: m.icon, label: m.label(valor), url: m.url(valor) });
  }
  if (local.instagram && !redesArr.find(r => r.red === "instagram")) {
    const h = local.instagram.replace(/^@/,"").replace(/.*instagram\.com\//,"").replace(/\/$/,"");
    if (h) links.push({ icon: "📸", label: `@${h}`, url: `https://instagram.com/${h}` });
  }
  if (local.web) {
    const u = local.web.startsWith("http") ? local.web : `https://${local.web}`;
    const d = u.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"");
    links.push({ icon: "🌐", label: d, url: u });
  }
  if (local.telefono) links.push({ icon: "📞", label: local.telefono, url: `tel:${local.telefono}` });
  return links;
}

function mapaScript(lat, lon, accent) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  return `<style>
    #map-wrap{position:relative;cursor:pointer}
    #map{filter:saturate(0.5) brightness(0.7);transition:filter 0.3s}
    #map-wrap:hover #map{filter:none}
    #map-cta{position:absolute;bottom:10px;right:10px;z-index:999;background:white;color:#1C1917;font-size:0.75rem;font-weight:700;padding:0.4rem 0.75rem;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,0.2);pointer-events:none;opacity:0;transition:opacity 0.2s}
    #map-wrap:hover #map-cta{opacity:1}
  </style>
  <script>document.addEventListener("DOMContentLoaded",function(){
    var m=L.map("map",{scrollWheelZoom:false,zoomControl:false,dragging:false}).setView([${lat},${lon}],15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(m);
    var ic=L.divIcon({html:'<div style="width:14px;height:14px;background:${accent};border-radius:50%;border:2.5px solid white;box-shadow:0 0 0 4px ${accent}55"></div>',iconAnchor:[7,7],iconSize:[14,14],className:""});
    L.marker([${lat},${lon}],{icon:ic}).addTo(m);
    document.getElementById("map-wrap").addEventListener("click",function(){window.open("${mapsUrl}","_blank")});
  });</script>`;
}

function formatFecha(fecha) {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

// ── TEMPLATE: BOLD ───────────────────────────────────────────────────────────

function buildBold(local, fotos, redesArr, eventos, paleta, sections) {
  const bg = "#0D1117", bg2 = "#161B22", bg3 = "#1F2937";
  const accent = paleta.primary;
  const links = getLinks(local, redesArr);
  const hasMap = sections.includes("mapa") && local.lat && local.lon;

  const heroStyle = local.foto_perfil
    ? `background:linear-gradient(to bottom,rgba(13,17,23,0.2) 0%,rgba(13,17,23,0.75) 55%,${bg} 100%),url('${esc(local.foto_perfil)}') center/cover no-repeat`
    : `background:linear-gradient(135deg,${accent}22 0%,${bg2} 45%,${bg} 100%)`;

  const soloDir = local.direccion
    ? local.direccion.replace(new RegExp(`,?\\s*${local.ciudad}\\s*$`, "i"), "").trim()
    : "";

  const linksHtml = links.map(l => `
    <a href="${esc(l.url)}" target="_blank" rel="noopener"
       style="display:flex;align-items:center;gap:0.875rem;padding:0.8rem 1rem;background:${l.cta ? accent : bg3};border-left:3px solid ${l.cta ? "transparent" : accent};border-radius:0 0.75rem 0.75rem 0;text-decoration:none;color:${l.cta ? "#fff" : "#E2E8F0"};font-size:0.92rem;font-weight:600"
       onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
      <span style="font-size:1.1rem;flex-shrink:0;opacity:0.85">${l.icon}</span>
      <span style="flex:1">${esc(l.label)}</span>
      <span style="color:${l.cta?"rgba(255,255,255,0.6)":"#475569"};font-size:0.8rem">↗</span>
    </a>`).join("");

  const label = txt => `<h2 style="font-size:0.68rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#475569;margin-bottom:0.875rem;padding-left:0.25rem">${txt}</h2>`;

  const galeriaHtml = sections.includes("galeria") && fotos.length ? `
    <section style="padding:2rem 0">${label("Fotos")}
      <div style="display:grid;grid-template-columns:repeat(${fotos.length===1?1:fotos.length===2?2:3},1fr);gap:3px;border-radius:0.75rem;overflow:hidden">
        ${fotos.map(f=>`<img src="${esc(f)}" alt="${esc(local.nombre)}" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">`).join("")}
      </div>
    </section>` : "";

  const eventosHtml = sections.includes("eventos") && eventos.length ? `
    <section style="padding:2rem 0">${label("Próximos eventos")}
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${eventos.map(e=>`
        <div style="background:${bg3};border:1px solid #2D3748;border-left:3px solid ${accent};border-radius:0 0.75rem 0.75rem 0;padding:0.875rem 1rem;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
          <div>
            <p style="font-weight:700;color:#F1F5F9;font-size:0.92rem;margin:0 0 0.2rem">${esc(e.titulo)}</p>
            ${e.descripcion?`<p style="font-size:0.78rem;color:#94A3B8;margin:0">${esc(e.descripcion)}</p>`:""}
            ${e.enlace?`<a href="${esc(e.enlace)}" target="_blank" style="font-size:0.76rem;color:${accent};font-weight:600;display:inline-block;margin-top:0.25rem">Ver más ↗</a>`:""}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <p style="font-size:0.76rem;font-weight:700;color:${accent};white-space:nowrap">${formatFecha(e.fecha)}</p>
            ${e.hora_inicio?`<p style="font-size:0.7rem;color:#64748B;margin-top:0.15rem">${esc(e.hora_inicio)}${e.hora_fin?`–${esc(e.hora_fin)}`:""}</p>`:""}
            ${e.precio?`<p style="font-size:0.7rem;color:#4ADE80;font-weight:600;margin-top:0.15rem">${esc(e.precio)}</p>`:""}
          </div>
        </div>`).join("")}
      </div>
    </section>` : "";

  const mapaHtml = hasMap ? `
    <section style="padding:2rem 0">${label("Dónde estamos")}
      <div id="map-wrap" style="border-radius:0.75rem;overflow:hidden;border:1px solid #2D3748">
        <div id="map" style="width:100%;height:200px"></div>
        <div id="map-cta">📍 Cómo llegar →</div>
      </div>
      ${mapaScript(local.lat, local.lon, accent)}
    </section>` : "";

  return `<!DOCTYPE html><html lang="es"><head>${getMeta(local)}${FONT_GEIST}${hasMap?LEAFLET:""}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Geist',system-ui,sans-serif;background:${bg};color:#F1F5F9;min-height:100vh}a[href]{cursor:pointer}</style>
</head><body>
  <div style="${heroStyle};min-height:${local.foto_perfil?"60vh":"auto"};display:flex;flex-direction:column;justify-content:flex-end;padding:${local.foto_perfil?"3rem 1.5rem 2.5rem":"3.5rem 1.5rem 2.5rem"}">
    <div style="max-width:680px">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
        <span style="background:${accent};color:white;font-size:0.68rem;font-weight:700;padding:0.2rem 0.65rem;border-radius:999px;text-transform:uppercase;letter-spacing:0.1em">${esc(local.tipo||"Bar")}</span>
        ${local.terraza?`<span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#94A3B8;font-size:0.68rem;font-weight:600;padding:0.2rem 0.65rem;border-radius:999px">☀️ Terraza</span>`:""}
        ${local.musica?`<span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#94A3B8;font-size:0.68rem;font-weight:600;padding:0.2rem 0.65rem;border-radius:999px">🎵 Música</span>`:""}
      </div>
      <h1 style="font-size:clamp(2.25rem,7vw,3.75rem);font-weight:900;line-height:1;letter-spacing:-0.03em;color:white;margin-bottom:0.875rem;text-transform:capitalize">${esc(local.nombre)}</h1>
      <p style="font-size:0.95rem;color:#64748B;font-weight:500">${esc(local.ciudad)}${soloDir?` · ${esc(soloDir)}`:""}</p>
      ${local.horario?`<p style="font-size:0.82rem;color:#475569;margin-top:0.35rem">🕒 ${esc(local.horario)}</p>`:""}
    </div>
  </div>
  <div style="max-width:680px;margin:0 auto;padding:0 1.25rem">
    ${local.descripcion?`<section style="padding:2rem 0;border-bottom:1px solid #1F2937"><p style="font-size:1rem;color:#94A3B8;line-height:1.75">${esc(local.descripcion)}</p></section>`:""}
    ${galeriaHtml}${eventosHtml}${mapaHtml}
    ${links.length?`<section style="padding:2rem 0;border-top:1px solid #1F2937">
      ${label("Contacto & redes")}<div style="display:flex;flex-direction:column;gap:0.4rem">${linksHtml}</div>
    </section>`:""}
    <footer style="padding:2rem 0;border-top:1px solid #1F2937;text-align:center">
      <a href="https://tresycuarto.com" style="font-size:0.78rem;color:#334155;text-decoration:none;font-weight:600">tres<span style="color:${accent}">y</span>cuarto · El tardeo en España</a>
    </footer>
  </div>
</body></html>`;
}

// ── TEMPLATE: FRESH ──────────────────────────────────────────────────────────

function buildFresh(local, fotos, redesArr, eventos, paleta, sections) {
  const accent = paleta.primary;
  const soft = paleta.soft;
  const links = getLinks(local, redesArr);
  const hasMap = sections.includes("mapa") && local.lat && local.lon;

  const linksHtml = links.map(l => `
    <a href="${esc(l.url)}" target="_blank" rel="noopener"
       style="display:flex;align-items:center;gap:0.875rem;padding:0.9rem 1.25rem;background:${l.cta?accent:"#FFFFFF"};border:2px solid ${l.cta?accent:"#F1F5F9"};border-radius:1rem;text-decoration:none;color:${l.cta?"white":"#1C1917"};font-size:0.95rem;font-weight:600;box-shadow:0 1px 6px rgba(0,0,0,0.05)"
       onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
      <span style="font-size:1.15rem">${l.icon}</span>
      <span style="flex:1">${esc(l.label)}</span>
      <span style="opacity:0.4;font-size:0.85rem">→</span>
    </a>`).join("");

  const galeriaHtml = sections.includes("galeria") && fotos.length ? `
    <section style="padding:2rem 1.5rem">
      <h2 style="font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:1rem">Galería</h2>
      <div style="display:grid;grid-template-columns:repeat(${fotos.length===1?1:fotos.length===2?2:3},1fr);gap:0.5rem;border-radius:1rem;overflow:hidden">
        ${fotos.map(f=>`<img src="${esc(f)}" alt="${esc(local.nombre)}" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover">`).join("")}
      </div>
    </section>` : "";

  const eventosHtml = sections.includes("eventos") && eventos.length ? `
    <section style="padding:0 1.5rem 2rem">
      <h2 style="font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:1rem">Próximos eventos</h2>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${eventos.map(e=>`
        <div style="background:#F8FAFC;border:1.5px solid #F1F5F9;border-radius:1rem;padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
          <div>
            <p style="font-weight:700;color:#1C1917;font-size:0.95rem;margin:0 0 0.2rem">${esc(e.titulo)}</p>
            ${e.descripcion?`<p style="font-size:0.8rem;color:#64748B;margin:0">${esc(e.descripcion)}</p>`:""}
            ${e.enlace?`<a href="${esc(e.enlace)}" target="_blank" style="font-size:0.78rem;color:${accent};font-weight:700;display:inline-block;margin-top:0.3rem">Ver más →</a>`:""}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <span style="background:${soft};color:${accent};font-size:0.75rem;font-weight:700;padding:0.3rem 0.7rem;border-radius:999px;white-space:nowrap">${formatFecha(e.fecha)}</span>
            ${e.hora_inicio?`<p style="font-size:0.72rem;color:#94A3B8;margin-top:0.3rem">${esc(e.hora_inicio)}${e.hora_fin?`–${esc(e.hora_fin)}`:""}</p>`:""}
            ${e.precio?`<p style="font-size:0.72rem;color:#059669;font-weight:700;margin-top:0.2rem">${esc(e.precio)}</p>`:""}
          </div>
        </div>`).join("")}
      </div>
    </section>` : "";

  const mapaHtml = hasMap ? `
    <section style="padding:0 1.5rem 2rem">
      <h2 style="font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:1rem">Cómo llegar</h2>
      <div id="map-wrap" style="border-radius:1rem;overflow:hidden;border:1.5px solid #F1F5F9;box-shadow:0 2px 12px rgba(0,0,0,0.06);cursor:pointer;position:relative">
        <div id="map" style="width:100%;height:220px"></div>
        <div id="map-cta">📍 Cómo llegar →</div>
      </div>
      ${mapaScript(local.lat, local.lon, accent)}
    </section>` : "";

  return `<!DOCTYPE html><html lang="es"><head>${getMeta(local)}${FONT_GEIST}${hasMap?LEAFLET:""}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Geist',system-ui,sans-serif;background:#FFFFFF;color:#1C1917;min-height:100vh}</style>
</head><body>
  <div style="background:linear-gradient(160deg,${paleta.light},${soft});padding:3rem 1.5rem 2rem;text-align:center;border-bottom:1.5px solid ${soft}">
    ${local.foto_perfil
      ? `<img src="${esc(local.foto_perfil)}" alt="${esc(local.nombre)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:4px solid white;box-shadow:0 4px 20px rgba(0,0,0,0.12);margin-bottom:1.25rem">`
      : `<div style="width:100px;height:100px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin:0 auto 1.25rem;box-shadow:0 4px 20px ${accent}44">🍹</div>`}
    <h1 style="font-size:2rem;font-weight:900;color:#1C1917;letter-spacing:-0.02em;line-height:1.1">${esc(local.nombre)}</h1>
    <p style="font-size:0.9rem;color:#64748B;margin-top:0.4rem;font-weight:500">${esc(local.tipo||"Bar")} · ${esc(local.ciudad)}</p>
    ${local.direccion?`<p style="font-size:0.82rem;color:#94A3B8;margin-top:0.3rem">📍 ${esc(local.direccion)}</p>`:""}
    ${local.horario?`<div style="display:inline-block;background:white;border:1.5px solid ${soft};border-radius:999px;padding:0.35rem 1rem;font-size:0.82rem;font-weight:600;color:#475569;margin-top:0.75rem">🕒 ${esc(local.horario)}</div>`:""}
    ${(local.terraza||local.musica)?`<div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-top:0.75rem">
      ${local.terraza?`<span style="background:white;border:1.5px solid #D1FAE5;color:#059669;font-size:0.78rem;font-weight:700;padding:0.3rem 0.75rem;border-radius:999px">☀️ Terraza</span>`:""}
      ${local.musica?`<span style="background:white;border:1.5px solid #EDE9FE;color:#7C3AED;font-size:0.78rem;font-weight:700;padding:0.3rem 0.75rem;border-radius:999px">🎵 Música</span>`:""}
    </div>`:""}
    ${local.descripcion?`<p style="font-size:0.95rem;color:#475569;line-height:1.65;margin-top:1.25rem;max-width:480px;margin-left:auto;margin-right:auto">${esc(local.descripcion)}</p>`:""}
  </div>
  ${links.length?`<section style="padding:2rem 1.5rem"><div style="display:flex;flex-direction:column;gap:0.6rem">${linksHtml}</div></section>`:""}
  ${galeriaHtml}${eventosHtml}${mapaHtml}
  <footer style="padding:2rem 1.5rem;text-align:center;border-top:1.5px solid #F1F5F9">
    <a href="https://tresycuarto.com" style="font-size:0.8rem;color:#CBD5E1;text-decoration:none;font-weight:600">tres<span style="color:${accent}">y</span>cuarto · El tardeo en España</a>
  </footer>
</body></html>`;
}

// ── TEMPLATE: ELEGANTE ───────────────────────────────────────────────────────

function buildElegante(local, fotos, redesArr, eventos, paleta, sections) {
  const accent = paleta.primary;
  const links = getLinks(local, redesArr);
  const hasMap = sections.includes("mapa") && local.lat && local.lon;

  const linksHtml = links.filter(l => !l.cta).map(l => `
    <a href="${esc(l.url)}" target="_blank" rel="noopener"
       style="display:flex;align-items:center;gap:0.875rem;padding:0.75rem 0;border-bottom:1px solid #F1F5F9;text-decoration:none;color:#374151;font-size:0.95rem;font-weight:500"
       onmouseover="this.style.color='${accent}'" onmouseout="this.style.color='#374151'">
      <span style="font-size:1.1rem;opacity:0.7">${l.icon}</span>
      <span style="flex:1">${esc(l.label)}</span>
      <span style="color:#D1D5DB;font-size:0.8rem">→</span>
    </a>`).join("");

  const galeriaHtml = sections.includes("galeria") && fotos.length ? `
    <section style="padding:3rem 1.5rem">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.5rem;font-weight:700;color:#111827;margin-bottom:1.5rem">Imágenes</h2>
      <div style="display:grid;grid-template-columns:${fotos.length===1?"1fr":"1fr 1fr"};gap:0.75rem">
        ${fotos.map((f,i)=>`<img src="${esc(f)}" alt="${esc(local.nombre)}" loading="lazy" style="width:100%;aspect-ratio:${fotos.length>2&&i===0?"2/1":"1"};object-fit:cover;border-radius:0.5rem">`).join("")}
      </div>
    </section>` : "";

  const eventosHtml = sections.includes("eventos") && eventos.length ? `
    <section style="padding:0 1.5rem 3rem">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.5rem;font-weight:700;color:#111827;margin-bottom:1.5rem">Próximos eventos</h2>
      <div style="display:flex;flex-direction:column;gap:0">
        ${eventos.map(e=>`
        <div style="padding:1.25rem 0;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
          <div>
            <p style="font-weight:600;color:#111827;font-size:1rem;margin:0 0 0.3rem">${esc(e.titulo)}</p>
            ${e.descripcion?`<p style="font-size:0.85rem;color:#6B7280;margin:0;line-height:1.5">${esc(e.descripcion)}</p>`:""}
            ${e.enlace?`<a href="${esc(e.enlace)}" target="_blank" style="font-size:0.82rem;color:${accent};font-weight:600;display:inline-block;margin-top:0.4rem">Reservar →</a>`:""}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <p style="font-size:0.82rem;font-weight:600;color:#374151;white-space:nowrap">${formatFecha(e.fecha)}</p>
            ${e.hora_inicio?`<p style="font-size:0.78rem;color:#9CA3AF;margin-top:0.15rem">${esc(e.hora_inicio)}${e.hora_fin?`–${esc(e.hora_fin)}`:""}</p>`:""}
            ${e.precio?`<p style="font-size:0.78rem;color:${accent};font-weight:700;margin-top:0.2rem">${esc(e.precio)}</p>`:""}
          </div>
        </div>`).join("")}
      </div>
    </section>` : "";

  const mapaHtml = hasMap ? `
    <section style="padding:0 1.5rem 3rem">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.5rem;font-weight:700;color:#111827;margin-bottom:1.25rem">Dónde encontrarnos</h2>
      <div id="map-wrap" style="border-radius:0.75rem;overflow:hidden;border:1px solid #E5E7EB;cursor:pointer;position:relative">
        <div id="map" style="width:100%;height:240px"></div>
        <div id="map-cta">📍 Cómo llegar →</div>
      </div>
      ${mapaScript(local.lat, local.lon, accent)}
    </section>` : "";

  return `<!DOCTYPE html><html lang="es"><head>${getMeta(local)}${FONT_PLAYFAIR}${hasMap?LEAFLET:""}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui,sans-serif;background:#FFFFFF;color:#111827;min-height:100vh}</style>
</head><body>
  <div style="position:relative;height:75vw;max-height:460px;min-height:280px;overflow:hidden">
    ${local.foto_perfil
      ? `<img src="${esc(local.foto_perfil)}" alt="${esc(local.nombre)}" style="width:100%;height:100%;object-fit:cover">`
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${accent}22,${accent}44);display:flex;align-items:center;justify-content:center;font-size:5rem">🍽️</div>`}
    <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0.1) 60%)"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:2rem 1.5rem">
      <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:0.5rem">${esc(local.tipo||"Restaurante")} · ${esc(local.ciudad)}</p>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2rem,7vw,3.5rem);font-weight:900;color:white;line-height:1;letter-spacing:-0.02em">${esc(local.nombre)}</h1>
    </div>
  </div>
  <div style="display:flex;gap:0;border-bottom:1px solid #F3F4F6;overflow-x:auto">
    ${local.horario?`<div style="padding:1rem 1.25rem;border-right:1px solid #F3F4F6;flex-shrink:0"><p style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;margin-bottom:0.25rem">Horario</p><p style="font-size:0.85rem;font-weight:500;color:#374151;white-space:nowrap">${esc(local.horario)}</p></div>`:""}
    ${local.direccion?`<div style="padding:1rem 1.25rem;flex-shrink:0"><p style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;margin-bottom:0.25rem">Dirección</p><p style="font-size:0.85rem;font-weight:500;color:#374151">${esc(local.direccion)}</p></div>`:""}
    ${local.terraza?`<div style="padding:1rem 1.25rem;border-left:1px solid #F3F4F6;flex-shrink:0"><p style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;margin-bottom:0.25rem">Extras</p><p style="font-size:0.82rem;font-weight:500;color:#374151">☀️ Terraza${local.musica?" · 🎵 Música":""}</p></div>`:""}
  </div>
  ${local.menu_url?`<div style="padding:1.75rem 1.5rem;border-bottom:1px solid #F3F4F6">
    <a href="${esc(local.menu_url)}" target="_blank" style="display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;background:${accent};color:white;border-radius:0.75rem;text-decoration:none;font-weight:700;font-size:1rem">
      <span>🍽️ Ver carta completa</span><span style="opacity:0.8">↗</span>
    </a>
  </div>`:""}
  ${local.descripcion?`<section style="padding:2.5rem 1.5rem;border-bottom:1px solid #F3F4F6">
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.5rem;font-weight:700;color:#111827;margin-bottom:1rem">Sobre nosotros</h2>
    <p style="font-size:1rem;color:#4B5563;line-height:1.75">${esc(local.descripcion)}</p>
  </section>`:""}
  ${galeriaHtml}
  ${linksHtml?`<section style="padding:2.5rem 1.5rem;border-top:1px solid #F3F4F6">
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.5rem;font-weight:700;color:#111827;margin-bottom:0.5rem">Contacto</h2>
    <div>${linksHtml}</div>
  </section>`:""}
  ${eventosHtml}${mapaHtml}
  <footer style="padding:2rem 1.5rem;text-align:center;border-top:1px solid #F3F4F6">
    <a href="https://tresycuarto.com" style="font-size:0.78rem;color:#D1D5DB;text-decoration:none;font-weight:500;letter-spacing:0.03em">tres<span style="color:${accent}">y</span>cuarto · El tardeo en España</a>
  </footer>
</body></html>`;
}

function notFoundHtml(slug) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>No encontrado · tresycuarto</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FFF8EF}</style>
  </head><body><div style="text-align:center;padding:2rem">
    <p style="font-size:3rem;margin-bottom:1rem">🍹</p>
    <h1 style="color:#1C1917;font-size:1.5rem;margin-bottom:0.5rem">Local no encontrado</h1>
    <a href="https://tresycuarto.com" style="background:#FB923C;color:white;padding:0.75rem 1.5rem;border-radius:0.75rem;font-weight:700;text-decoration:none">Explorar tresycuarto</a>
  </div></body></html>`;
}
