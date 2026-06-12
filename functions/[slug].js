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
    "SELECT id, nombre, tipo, ciudad, direccion, telefono, web, instagram, horario, terraza, musica, descripcion, foto_perfil, fotos, menu_url, redes, lat, lon, rating, rating_count FROM locales WHERE id = ?"
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
  <meta name="twitter:card" content="${local.foto_perfil ? "summary_large_image" : "summary"}">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  ${jsonLd(local)}`;
}

// Datos estructurados schema.org → Google puede mostrar la ficha con estrellas, horario y mapa
function jsonLd(local) {
  const d = {
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    name: local.nombre,
    address: { "@type": "PostalAddress", addressLocality: local.ciudad, addressCountry: "ES" },
  };
  if (local.direccion) d.address.streetAddress = local.direccion;
  if (local.telefono) d.telephone = local.telefono;
  if (local.web) d.url = local.web.startsWith("http") ? local.web : `https://${local.web}`;
  if (local.foto_perfil) d.image = local.foto_perfil;
  if (local.lat && local.lon) d.geo = { "@type": "GeoCoordinates", latitude: local.lat, longitude: local.lon };
  if (local.rating) d.aggregateRating = { "@type": "AggregateRating", ratingValue: local.rating, reviewCount: local.rating_count || 1 };
  return `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`;
}

// Estrellas de valoración (compartido por las 3 plantillas)
function ratingStars(local, { color = "#F59E0B", muted = "#94A3B8", text = "#1C1917" } = {}) {
  if (!local.rating) return "";
  const full = Math.round(local.rating);
  const estrellas = "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  return `<div style="display:inline-flex;align-items:center;gap:0.4rem;margin-top:0.6rem">
    <span style="color:${color};font-size:1rem;letter-spacing:1px">${estrellas}</span>
    <span style="font-size:0.82rem;font-weight:800;color:${text}">${local.rating}</span>
    <span style="font-size:0.78rem;color:${muted}">(${local.rating_count || 0})</span>
  </div>`;
}

// Botón compartir nativo (Web Share API con fallback a copiar)
function shareBtn(dark) {
  const bg = dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.85)";
  const col = dark ? "#fff" : "#1C1917";
  return `<button onclick="if(navigator.share){navigator.share({title:document.title,url:location.href})}else{navigator.clipboard.writeText(location.href)}" aria-label="Compartir" style="position:absolute;top:1rem;right:1rem;z-index:3;width:38px;height:38px;border-radius:50%;border:none;background:${bg};color:${col};box-shadow:0 2px 8px rgba(0,0,0,0.12);cursor:pointer;font-size:1rem;line-height:1">↗</button>`;
}

// Barra de acciones fija inferior (Llamar / Cómo llegar) — la conversión clave en móvil
function barraAcciones(local, accent, dark) {
  const hasMap = local.lat && local.lon;
  const acc = [];
  if (local.telefono) acc.push(`<a href="tel:${esc(local.telefono)}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.85rem;background:${accent};color:#fff;border-radius:0.9rem;text-decoration:none;font-weight:800;font-size:0.9rem">📞 Llamar</a>`);
  if (hasMap) acc.push(`<a href="https://www.google.com/maps/dir/?api=1&destination=${local.lat},${local.lon}" target="_blank" rel="noopener" style="flex:1;display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.85rem;background:${dark ? "#fff" : "#1C1917"};color:${dark ? "#0D1117" : "#fff"};border-radius:0.9rem;text-decoration:none;font-weight:800;font-size:0.9rem">📍 Cómo llegar</a>`);
  if (!acc.length) return "";
  const barBg = dark ? "rgba(13,17,23,0.92)" : "rgba(255,255,255,0.92)";
  const barBorder = dark ? "#1F2937" : "#F1F5F9";
  return `<div style="position:fixed;bottom:0;left:0;right:0;z-index:50;display:flex;gap:0.6rem;padding:0.7rem 1rem calc(0.7rem + env(safe-area-inset-bottom));background:${barBg};backdrop-filter:blur(10px);border-top:1px solid ${barBorder};max-width:680px;margin:0 auto">${acc.join("")}</div><div style="height:5rem"></div>`;
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
    ? `background:linear-gradient(to bottom,rgba(13,17,23,0.15) 0%,rgba(13,17,23,0.78) 60%,${bg} 100%),url('${esc(local.foto_perfil)}') center/cover no-repeat`
    : `background:linear-gradient(135deg,${accent}22 0%,${bg2} 45%,${bg} 100%)`;

  const soloDir = local.direccion
    ? local.direccion.replace(new RegExp(`,?\\s*${local.ciudad}\\s*$`, "i"), "").trim()
    : "";

  const linksHtml = links.map(l => `
    <a href="${esc(l.url)}" target="_blank" rel="noopener"
       style="display:flex;align-items:center;gap:0.875rem;padding:0.9rem 1rem;background:${l.cta ? accent : bg3};border-left:3px solid ${l.cta ? "transparent" : accent};border-radius:0 0.85rem 0.85rem 0;text-decoration:none;color:${l.cta ? "#fff" : "#E2E8F0"};font-size:0.92rem;font-weight:600;transition:transform .12s,background .12s"
       onmouseover="this.style.transform='translateX(3px)'" onmouseout="this.style.transform='translateX(0)'">
      <span style="font-size:1.15rem;flex-shrink:0;opacity:0.9">${l.icon}</span>
      <span style="flex:1">${esc(l.label)}</span>
      <span style="color:${l.cta?"rgba(255,255,255,0.6)":"#475569"};font-size:0.8rem">↗</span>
    </a>`).join("");

  const label = txt => `<h2 style="font-size:0.68rem;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#475569;margin-bottom:0.875rem;padding-left:0.25rem">${txt}</h2>`;

  const galeriaHtml = sections.includes("galeria") && fotos.length ? `
    <section style="padding:2rem 0">${label("Fotos")}
      <div style="display:grid;grid-template-columns:repeat(${fotos.length===1?1:fotos.length===2?2:3},1fr);gap:4px;border-radius:0.85rem;overflow:hidden">
        ${fotos.map(f=>`<img src="${esc(f)}" alt="${esc(local.nombre)}" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">`).join("")}
      </div>
    </section>` : "";

  const eventosHtml = sections.includes("eventos") && eventos.length ? `
    <section style="padding:2rem 0">${label("Próximos eventos")}
      <div style="display:flex;flex-direction:column;gap:0.6rem">
        ${eventos.map(e=>`
        <div style="background:${bg3};border:1px solid #2D3748;border-radius:0.85rem;padding:0.9rem 1rem;display:flex;align-items:center;gap:1rem">
          <div style="text-align:center;flex-shrink:0;background:${accent};color:#fff;border-radius:0.7rem;padding:0.45rem 0.6rem;min-width:50px">
            <div style="font-size:0.62rem;font-weight:800;text-transform:uppercase;opacity:0.85">${formatFecha(e.fecha).split(",")[0]}</div>
            <div style="font-size:1.25rem;font-weight:900;line-height:1">${new Date(e.fecha+"T12:00:00").getDate()}</div>
          </div>
          <div style="flex:1;min-width:0">
            <p style="font-weight:800;color:#F1F5F9;font-size:0.92rem;margin:0 0 0.2rem">${esc(e.titulo)}</p>
            ${e.descripcion?`<p style="font-size:0.78rem;color:#94A3B8;margin:0">${esc(e.descripcion)}</p>`:""}
            <div style="display:flex;gap:0.5rem;align-items:center;margin-top:0.25rem">
              ${e.hora_inicio?`<span style="font-size:0.7rem;color:#64748B">🕒 ${esc(e.hora_inicio)}${e.hora_fin?`–${esc(e.hora_fin)}`:""}</span>`:""}
              ${e.precio?`<span style="font-size:0.68rem;color:#4ADE80;font-weight:700;background:#052e16;padding:0.1rem 0.45rem;border-radius:999px">${esc(e.precio)}</span>`:""}
            </div>
          </div>
          ${e.enlace?`<a href="${esc(e.enlace)}" target="_blank" rel="noopener" style="font-size:0.76rem;color:${accent};font-weight:700;flex-shrink:0">Ver ↗</a>`:""}
        </div>`).join("")}
      </div>
    </section>` : "";

  const mapaHtml = hasMap ? `
    <section style="padding:2rem 0">${label("Dónde estamos")}
      <div id="map-wrap" style="border-radius:0.85rem;overflow:hidden;border:1px solid #2D3748">
        <div id="map" style="width:100%;height:200px"></div>
        <div id="map-cta">📍 Cómo llegar →</div>
      </div>
      ${mapaScript(local.lat, local.lon, accent)}
    </section>` : "";

  return `<!DOCTYPE html><html lang="es"><head>${getMeta(local)}${FONT_GEIST}${hasMap?LEAFLET:""}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Geist',system-ui,sans-serif;background:${bg};color:#F1F5F9;min-height:100vh}a[href]{cursor:pointer}</style>
</head><body>
  <div style="position:relative;${heroStyle};min-height:${local.foto_perfil?"62vh":"auto"};display:flex;flex-direction:column;justify-content:flex-end;padding:${local.foto_perfil?"3rem 1.5rem 2.5rem":"3.5rem 1.5rem 2.5rem"};max-width:680px;margin:0 auto">
    ${shareBtn(true)}
    <div>
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
        <span style="background:${accent};color:white;font-size:0.68rem;font-weight:800;padding:0.2rem 0.65rem;border-radius:999px;text-transform:uppercase;letter-spacing:0.1em">${esc(local.tipo||"Bar")}</span>
        ${local.terraza?`<span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#94A3B8;font-size:0.68rem;font-weight:600;padding:0.2rem 0.65rem;border-radius:999px">☀️ Terraza</span>`:""}
        ${local.musica?`<span style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#94A3B8;font-size:0.68rem;font-weight:600;padding:0.2rem 0.65rem;border-radius:999px">🎵 Música</span>`:""}
      </div>
      <h1 style="font-size:clamp(2.25rem,7vw,3.75rem);font-weight:900;line-height:1;letter-spacing:-0.03em;color:white;margin-bottom:0.6rem;text-transform:capitalize">${esc(local.nombre)}</h1>
      <p style="font-size:0.95rem;color:#94A3B8;font-weight:500">${esc(local.ciudad)}${soloDir?` · ${esc(soloDir)}`:""}</p>
      ${ratingStars(local, { muted: "#64748B", text: "#F1F5F9" })}
      ${local.horario?`<p style="font-size:0.82rem;color:#64748B;margin-top:0.5rem">🕒 ${esc(local.horario)}</p>`:""}
    </div>
  </div>
  <div style="max-width:680px;margin:0 auto;padding:0 1.25rem">
    ${local.descripcion?`<section style="padding:2rem 0;border-bottom:1px solid #1F2937"><p style="font-size:1rem;color:#94A3B8;line-height:1.75">${esc(local.descripcion)}</p></section>`:""}
    ${galeriaHtml}${eventosHtml}${mapaHtml}
    ${links.length?`<section style="padding:2rem 0;border-top:1px solid #1F2937">
      ${label("Contacto & redes")}<div style="display:flex;flex-direction:column;gap:0.45rem">${linksHtml}</div>
    </section>`:""}
    <footer style="padding:2rem 0;text-align:center;border-top:1px solid #1F2937">
      <a href="https://tresycuarto.com" style="font-size:0.78rem;color:#334155;text-decoration:none;font-weight:600">tres<span style="color:${accent}">y</span>cuarto · El tardeo en España</a>
    </footer>
  </div>
  ${barraAcciones(local, accent, true)}
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
       style="display:flex;align-items:center;gap:0.875rem;padding:0.95rem 1.25rem;background:${l.cta?accent:"#FFFFFF"};border:1.5px solid ${l.cta?accent:"#EEF1F4"};border-radius:1rem;text-decoration:none;color:${l.cta?"white":"#1C1917"};font-size:0.95rem;font-weight:600;box-shadow:0 2px 10px rgba(17,24,39,0.04);transition:transform .12s,box-shadow .12s"
       onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 18px rgba(17,24,39,0.10)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 10px rgba(17,24,39,0.04)'">
      <span style="font-size:1.2rem">${l.icon}</span>
      <span style="flex:1">${esc(l.label)}</span>
      <span style="opacity:0.35;font-size:0.85rem">→</span>
    </a>`).join("");

  const galeriaHtml = sections.includes("galeria") && fotos.length ? `
    <section style="padding:2rem 1.5rem">
      <h2 style="font-size:0.72rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A3B8;margin-bottom:1rem">Galería</h2>
      <div style="display:grid;grid-template-columns:repeat(${fotos.length===1?1:fotos.length===2?2:3},1fr);gap:0.5rem;border-radius:1.25rem;overflow:hidden">
        ${fotos.map(f=>`<img src="${esc(f)}" alt="${esc(local.nombre)}" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;transition:transform .3s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">`).join("")}
      </div>
    </section>` : "";

  const eventosHtml = sections.includes("eventos") && eventos.length ? `
    <section style="padding:0 1.5rem 2rem">
      <h2 style="font-size:0.72rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A3B8;margin-bottom:1rem">Próximos eventos</h2>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${eventos.map(e=>`
        <div style="background:linear-gradient(135deg,#fff,${soft}55);border:1.5px solid ${soft};border-radius:1.25rem;padding:1rem 1.25rem;display:flex;justify-content:space-between;gap:1rem;align-items:center">
          <div style="min-width:0">
            <p style="font-weight:800;color:#1C1917;font-size:0.95rem;margin:0 0 0.2rem">${esc(e.titulo)}</p>
            ${e.descripcion?`<p style="font-size:0.8rem;color:#64748B;margin:0">${esc(e.descripcion)}</p>`:""}
            ${e.precio?`<span style="display:inline-block;margin-top:0.4rem;background:#DCFCE7;color:#059669;font-size:0.7rem;font-weight:700;padding:0.15rem 0.55rem;border-radius:999px">${esc(e.precio)}</span>`:""}
            ${e.enlace?`<a href="${esc(e.enlace)}" target="_blank" rel="noopener" style="font-size:0.78rem;color:${accent};font-weight:700;display:inline-block;margin-top:0.3rem;margin-left:0.4rem">Ver más →</a>`:""}
          </div>
          <div style="text-align:center;flex-shrink:0;background:${accent};color:#fff;border-radius:0.85rem;padding:0.5rem 0.7rem;min-width:54px">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;opacity:0.85">${formatFecha(e.fecha).split(",")[0]}</div>
            <div style="font-size:1.3rem;font-weight:900;line-height:1">${new Date(e.fecha+"T12:00:00").getDate()}</div>
            ${e.hora_inicio?`<div style="font-size:0.62rem;opacity:0.9">${esc(e.hora_inicio)}</div>`:""}
          </div>
        </div>`).join("")}
      </div>
    </section>` : "";

  const mapaHtml = hasMap ? `
    <section style="padding:0 1.5rem 2rem">
      <h2 style="font-size:0.72rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A3B8;margin-bottom:1rem">Dónde estamos</h2>
      <div id="map-wrap" style="border-radius:1.25rem;overflow:hidden;border:1.5px solid #EEF1F4;box-shadow:0 4px 16px rgba(17,24,39,0.06);position:relative">
        <div id="map" style="width:100%;height:220px"></div>
        <div id="map-cta">📍 Cómo llegar →</div>
      </div>
      ${mapaScript(local.lat, local.lon, accent)}
    </section>` : "";

  return `<!DOCTYPE html><html lang="es"><head>${getMeta(local)}${FONT_GEIST}${hasMap?LEAFLET:""}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Geist',system-ui,sans-serif;background:#FFFFFF;color:#1C1917;min-height:100vh}.wrap{max-width:560px;margin:0 auto}</style>
</head><body><div class="wrap">
  <header style="position:relative;background:linear-gradient(165deg,${paleta.light},${soft});padding:2.75rem 1.5rem 2.25rem;text-align:center;border-bottom:1px solid ${soft};overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 20% 0%,${accent}14,transparent 60%)"></div>
    ${shareBtn(false)}
    <div style="position:relative">
      ${local.foto_perfil
        ? `<img src="${esc(local.foto_perfil)}" alt="${esc(local.nombre)}" style="width:108px;height:108px;border-radius:50%;object-fit:cover;border:4px solid white;box-shadow:0 8px 28px rgba(17,24,39,0.18);margin-bottom:1.1rem">`
        : `<div style="width:108px;height:108px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;font-size:2.6rem;margin:0 auto 1.1rem;box-shadow:0 8px 28px ${accent}44">🍹</div>`}
      <h1 style="font-size:2.1rem;font-weight:900;color:#1C1917;letter-spacing:-0.03em;line-height:1.05;text-transform:capitalize">${esc(local.nombre)}</h1>
      <p style="font-size:0.9rem;color:#64748B;margin-top:0.45rem;font-weight:600;text-transform:capitalize">${esc(local.tipo||"Bar")} · ${esc(local.ciudad)}</p>
      ${ratingStars(local)}
      <div style="display:flex;gap:0.4rem;justify-content:center;flex-wrap:wrap;margin-top:0.85rem">
        ${local.horario?`<span style="display:inline-flex;align-items:center;gap:0.3rem;background:white;border:1px solid ${soft};border-radius:999px;padding:0.35rem 0.85rem;font-size:0.78rem;font-weight:600;color:#475569">🕒 ${esc(local.horario)}</span>`:""}
        ${local.terraza?`<span style="background:white;border:1px solid #D1FAE5;color:#059669;font-size:0.78rem;font-weight:700;padding:0.35rem 0.8rem;border-radius:999px">☀️ Terraza</span>`:""}
        ${local.musica?`<span style="background:white;border:1px solid #EDE9FE;color:#7C3AED;font-size:0.78rem;font-weight:700;padding:0.35rem 0.8rem;border-radius:999px">🎵 Música</span>`:""}
      </div>
      ${local.direccion?`<p style="font-size:0.82rem;color:#94A3B8;margin-top:0.8rem">📍 ${esc(local.direccion)}</p>`:""}
      ${local.descripcion?`<p style="font-size:0.95rem;color:#475569;line-height:1.65;margin-top:1.2rem;max-width:440px;margin-left:auto;margin-right:auto">${esc(local.descripcion)}</p>`:""}
    </div>
  </header>
  ${links.length?`<section style="padding:1.75rem 1.5rem 0.5rem"><div style="display:flex;flex-direction:column;gap:0.6rem">${linksHtml}</div></section>`:""}
  ${galeriaHtml}${eventosHtml}${mapaHtml}
  <footer style="padding:2rem 1.5rem;text-align:center;border-top:1px solid #F1F5F9">
    <a href="https://tresycuarto.com" style="font-size:0.8rem;color:#CBD5E1;text-decoration:none;font-weight:600">tres<span style="color:${accent}">y</span>cuarto · El tardeo en España</a>
  </footer>
  ${barraAcciones(local, accent, false)}
</div></body></html>`;
}

// ── TEMPLATE: ELEGANTE ───────────────────────────────────────────────────────

function buildElegante(local, fotos, redesArr, eventos, paleta, sections) {
  const accent = paleta.primary;
  const links = getLinks(local, redesArr);
  const hasMap = sections.includes("mapa") && local.lat && local.lon;

  const linksHtml = links.filter(l => !l.cta).map(l => `
    <a href="${esc(l.url)}" target="_blank" rel="noopener"
       style="display:flex;align-items:center;gap:0.875rem;padding:0.85rem 0;border-bottom:1px solid #F1F5F9;text-decoration:none;color:#374151;font-size:0.95rem;font-weight:500"
       onmouseover="this.style.color='${accent}'" onmouseout="this.style.color='#374151'">
      <span style="font-size:1.1rem;opacity:0.7">${l.icon}</span>
      <span style="flex:1">${esc(l.label)}</span>
      <span style="color:#D1D5DB;font-size:0.8rem">→</span>
    </a>`).join("");

  const galeriaHtml = sections.includes("galeria") && fotos.length ? `
    <section style="padding:3rem 1.5rem">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.6rem;font-weight:700;color:#111827;margin-bottom:1.5rem">Imágenes</h2>
      <div style="display:grid;grid-template-columns:${fotos.length===1?"1fr":"1fr 1fr"};gap:0.75rem">
        ${fotos.map((f,i)=>`<img src="${esc(f)}" alt="${esc(local.nombre)}" loading="lazy" style="width:100%;aspect-ratio:${fotos.length>2&&i===0?"2/1":"1"};object-fit:cover;border-radius:0.6rem">`).join("")}
      </div>
    </section>` : "";

  const eventosHtml = sections.includes("eventos") && eventos.length ? `
    <section style="padding:0 1.5rem 3rem">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.6rem;font-weight:700;color:#111827;margin-bottom:1.5rem">Agenda</h2>
      <div style="display:flex;flex-direction:column;gap:0">
        ${eventos.map(e=>`
        <div style="padding:1.25rem 0;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
          <div>
            <p style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#111827;font-size:1.1rem;margin:0 0 0.3rem">${esc(e.titulo)}</p>
            ${e.descripcion?`<p style="font-size:0.85rem;color:#6B7280;margin:0;line-height:1.5">${esc(e.descripcion)}</p>`:""}
            ${e.enlace?`<a href="${esc(e.enlace)}" target="_blank" rel="noopener" style="font-size:0.82rem;color:${accent};font-weight:600;display:inline-block;margin-top:0.4rem">Reservar →</a>`:""}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <p style="font-size:0.82rem;font-weight:600;color:#374151;white-space:nowrap;text-transform:capitalize">${formatFecha(e.fecha)}</p>
            ${e.hora_inicio?`<p style="font-size:0.78rem;color:#9CA3AF;margin-top:0.15rem">${esc(e.hora_inicio)}${e.hora_fin?`–${esc(e.hora_fin)}`:""}</p>`:""}
            ${e.precio?`<p style="font-size:0.78rem;color:${accent};font-weight:700;margin-top:0.2rem">${esc(e.precio)}</p>`:""}
          </div>
        </div>`).join("")}
      </div>
    </section>` : "";

  const mapaHtml = hasMap ? `
    <section style="padding:0 1.5rem 3rem">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.6rem;font-weight:700;color:#111827;margin-bottom:1.25rem">Dónde encontrarnos</h2>
      <div id="map-wrap" style="border-radius:0.6rem;overflow:hidden;border:1px solid #E5E7EB;position:relative">
        <div id="map" style="width:100%;height:240px"></div>
        <div id="map-cta">📍 Cómo llegar →</div>
      </div>
      ${mapaScript(local.lat, local.lon, accent)}
    </section>` : "";

  return `<!DOCTYPE html><html lang="es"><head>${getMeta(local)}${FONT_PLAYFAIR}${hasMap?LEAFLET:""}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui,sans-serif;background:#FFFFFF;color:#111827;min-height:100vh}.wrap{max-width:620px;margin:0 auto}</style>
</head><body><div class="wrap">
  <div style="position:relative;height:78vw;max-height:480px;min-height:300px;overflow:hidden">
    ${local.foto_perfil
      ? `<img src="${esc(local.foto_perfil)}" alt="${esc(local.nombre)}" style="width:100%;height:100%;object-fit:cover">`
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${accent}22,${accent}44);display:flex;align-items:center;justify-content:center;font-size:5rem">🍽️</div>`}
    <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.05) 55%)"></div>
    ${shareBtn(true)}
    <div style="position:absolute;bottom:0;left:0;right:0;padding:2rem 1.5rem">
      <p style="font-size:0.72rem;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.75);margin-bottom:0.5rem">${esc(local.tipo||"Restaurante")} · ${esc(local.ciudad)}</p>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(2rem,7vw,3.5rem);font-weight:900;color:white;line-height:1;letter-spacing:-0.02em">${esc(local.nombre)}</h1>
      ${ratingStars(local, { muted: "rgba(255,255,255,0.7)", text: "#fff" })}
    </div>
  </div>
  <div style="display:flex;gap:0;border-bottom:1px solid #F3F4F6;overflow-x:auto">
    ${local.horario?`<div style="padding:1rem 1.25rem;border-right:1px solid #F3F4F6;flex-shrink:0"><p style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;margin-bottom:0.25rem">Horario</p><p style="font-size:0.85rem;font-weight:500;color:#374151;white-space:nowrap">${esc(local.horario)}</p></div>`:""}
    ${local.direccion?`<div style="padding:1rem 1.25rem;flex-shrink:0"><p style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;margin-bottom:0.25rem">Dirección</p><p style="font-size:0.85rem;font-weight:500;color:#374151">${esc(local.direccion)}</p></div>`:""}
    ${(local.terraza||local.musica)?`<div style="padding:1rem 1.25rem;border-left:1px solid #F3F4F6;flex-shrink:0"><p style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;margin-bottom:0.25rem">Extras</p><p style="font-size:0.82rem;font-weight:500;color:#374151">${local.terraza?"☀️ Terraza":""}${local.terraza&&local.musica?" · ":""}${local.musica?"🎵 Música":""}</p></div>`:""}
  </div>
  ${local.menu_url?`<div style="padding:1.75rem 1.5rem;border-bottom:1px solid #F3F4F6">
    <a href="${esc(local.menu_url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;background:${accent};color:white;border-radius:0.6rem;text-decoration:none;font-weight:700;font-size:1rem">
      <span>🍽️ Ver carta completa</span><span style="opacity:0.8">↗</span>
    </a>
  </div>`:""}
  ${local.descripcion?`<section style="padding:2.5rem 1.5rem;border-bottom:1px solid #F3F4F6">
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.6rem;font-weight:700;color:#111827;margin-bottom:1rem">Sobre nosotros</h2>
    <p style="font-size:1.05rem;color:#4B5563;line-height:1.8">${esc(local.descripcion)}</p>
  </section>`:""}
  ${galeriaHtml}
  ${linksHtml?`<section style="padding:2.5rem 1.5rem;border-top:1px solid #F3F4F6">
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:1.6rem;font-weight:700;color:#111827;margin-bottom:0.5rem">Contacto</h2>
    <div>${linksHtml}</div>
  </section>`:""}
  ${eventosHtml}${mapaHtml}
  <footer style="padding:2rem 1.5rem;text-align:center;border-top:1px solid #F3F4F6">
    <a href="https://tresycuarto.com" style="font-size:0.78rem;color:#D1D5DB;text-decoration:none;font-weight:500;letter-spacing:0.03em">tres<span style="color:${accent}">y</span>cuarto · El tardeo en España</a>
  </footer>
  ${barraAcciones(local, accent, false)}
</div></body></html>`;
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
