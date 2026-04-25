// Ficha individual de local — URL limpia para SEO
// /locales/sevilla/bodeguita-la-reja

const CIUDAD_MAP = {
  "albacete":"Albacete","alcala-de-henares":"Alcalá de Henares","algeciras":"Algeciras",
  "almeria":"Almería","altea":"Altea","arona":"Arona","avila":"Ávila",
  "badajoz":"Badajoz","barakaldo":"Barakaldo","barcelona":"Barcelona","benidorm":"Benidorm",
  "bilbao":"Bilbao","burgos":"Burgos","caceres":"Cáceres","cadiz":"Cádiz",
  "cartagena":"Cartagena","ciudad-real":"Ciudad Real","cordoba":"Córdoba","cuenca":"Cuenca",
  "cullera":"Cullera","denia":"Dénia","getafe":"Getafe","girona":"Girona",
  "granada":"Granada","guadalajara":"Guadalajara","huelva":"Huelva","huesca":"Huesca",
  "jaen":"Jaén","jerez-de-la-frontera":"Jerez de la Frontera","la-coruna":"La Coruña",
  "las-palmas":"Las Palmas","leganes":"Leganés","leon":"León","lleida":"Lleida",
  "logrono":"Logroño","lorca":"Lorca","lugo":"Lugo","madrid":"Madrid","malaga":"Málaga",
  "mostoles":"Móstoles","murcia":"Murcia","oviedo":"Oviedo","palencia":"Palencia",
  "palma":"Palma","pamplona":"Pamplona","pontevedra":"Pontevedra","salamanca":"Salamanca",
  "san-sebastian":"San Sebastián","santa-cruz-de-tenerife":"Santa Cruz de Tenerife",
  "santa-pola":"Santa Pola","santander":"Santander","segovia":"Segovia","sevilla":"Sevilla",
  "soria":"Soria","tarragona":"Tarragona","teruel":"Teruel","toledo":"Toledo",
  "torrevieja":"Torrevieja","valencia":"Valencia","valladolid":"Valladolid",
  "vinaros":"Vinaròs","vitoria":"Vitoria","zamora":"Zamora","zaragoza":"Zaragoza",
  "alicante":"Alicante","vigo":"Vigo","gijon":"Gijón",
  "hospitalet-de-llobregat":"Hospitalet de Llobregat","badalona":"Badalona","elche":"Elche",
  "sabadell":"Sabadell","terrassa":"Terrassa","alcorcon":"Alcorcón","fuenlabrada":"Fuenlabrada",
  "mataro":"Mataró","reus":"Reus","manresa":"Manresa","castello-de-la-plana":"Castelló de la Plana",
};

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function tipoLabel(tipo) {
  return { bar:"Bar", cafe:"Cafetería", pub:"Pub", biergarten:"Terraza" }[tipo] || "Local";
}

function renderLocal(local, ciudadSlug) {
  const canonicalUrl = `https://tresycuarto.com/locales/${ciudadSlug}/${esc(local.slug)}`;
  const ciudadUrl    = `https://tresycuarto.com/locales/${ciudadSlug}`;
  // Descripción SEO enriquecida con datos reales para mejorar CTR
  const tieneTerraza = local.outdoor_seating || local.terraza;
  const ratingStr    = (local.rating && local.rating > 0) ? `⭐ ${Number(local.rating).toFixed(1)}` : null;
  const terrazaStr   = tieneTerraza ? "Terraza ☀️" : null;
  const horarioStr   = local.horario ? "Horario disponible" : null;

  const descParts = [
    `${tipoLabel(local.tipo || "bar")} en ${local.ciudad}`,
    local.direccion || null,
    [terrazaStr, ratingStr, horarioStr].filter(Boolean).join(" · ") || null,
    "Ver fotos y cómo llegar.",
  ].filter(Boolean);
  const desc = local.descripcion_google || descParts.join(". ");

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    name: local.nombre,
    address: local.direccion ? {
      "@type": "PostalAddress",
      streetAddress: local.direccion,
      addressLocality: local.ciudad,
      addressCountry: "ES",
    } : undefined,
    telephone: local.telefono || undefined,
    url: local.web || canonicalUrl,
    openingHours: local.horario || undefined,
    priceRange: local.price_level || undefined,
    aggregateRating: (local.rating && local.rating > 0 && local.rating_count >= 5) ? {
      "@type": "AggregateRating",
      ratingValue: Number(local.rating).toFixed(1),
      reviewCount: local.rating_count,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    geo: (local.lat && local.lon) ? {
      "@type": "GeoCoordinates",
      latitude: local.lat,
      longitude: local.lon,
    } : undefined,
    image: local.photo_url || undefined,
  });

  const breadcrumb = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "tresycuarto", item: "https://tresycuarto.com" },
      { "@type": "ListItem", position: 2, name: `Tardeo en ${local.ciudad}`, item: ciudadUrl },
      { "@type": "ListItem", position: 3, name: local.nombre, item: canonicalUrl },
    ],
  });

  const ogImage = local.photo_url || `https://tresycuarto.com/og-default.png`;
  // Title SEO con datos clave para mejorar CTR en Google
  const titleRating  = (local.rating && local.rating > 0) ? ` ⭐ ${Number(local.rating).toFixed(1)}` : "";
  const titleTerraza = (local.outdoor_seating || local.terraza) ? " · Terraza" : "";
  const title = `${local.nombre} · ${tipoLabel(local.tipo || "bar")} en ${local.ciudad}${titleRating}${titleTerraza} | tresycuarto`;

  const featureBadges = [
    (local.outdoor_seating || local.terraza) ? `<span class="fbadge badge-terraza">☀️ Terraza</span>` : "",
    local.live_music        ? `<span class="fbadge badge-musica">🎵 Música en directo</span>` : "",
    local.good_for_groups   ? `<span class="fbadge badge-grupos">👥 Ideal para grupos</span>` : "",
    local.allows_dogs       ? `<span class="fbadge badge-dogs">🐾 Pet-friendly</span>` : "",
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}"/>
  <link rel="canonical" href="${canonicalUrl}"/>
  <meta property="og:title" content="${esc(local.nombre)} — ${esc(local.ciudad)} | tresycuarto"/>
  <meta property="og:description" content="${esc(desc)}"/>
  <meta property="og:image" content="${esc(ogImage)}"/>
  <meta property="og:type" content="place"/>
  <meta property="og:site_name" content="tresycuarto"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <script type="application/ld+json">${schema}</script>
  <script type="application/ld+json">${breadcrumb}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,sans-serif;background:#FFF8EF;color:#1C1917;min-height:100vh}
    nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid #F5E6D3;background:rgba(255,248,239,0.95);position:sticky;top:0;backdrop-filter:blur(8px);z-index:10}
    .logo{font-weight:900;font-size:1.1rem;color:#1C1917;text-decoration:none}
    .logo span{color:#FB923C}
    .container{max-width:680px;margin:0 auto;padding:2.5rem 1.5rem}
    .tipo-badge{display:inline-block;font-size:0.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#FB923C;background:#FEF0DC;padding:.3rem .8rem;border-radius:999px;margin-bottom:1rem}
    h1{font-size:clamp(1.8rem,5vw,2.5rem);font-weight:900;letter-spacing:-.03em;line-height:1.15;margin-bottom:.4rem}
    .ciudad-line{color:#A78BFA;font-weight:600;font-size:1rem;margin-bottom:1.5rem}
    .rating-row{display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
    .stars{color:#F59E0B;font-size:1.1rem}
    .rating-num{font-weight:700;font-size:1rem}
    .rating-count{font-size:.85rem;color:#78716C}
    .price{display:inline-block;font-size:.8rem;font-weight:700;color:#059669;background:#ECFDF5;padding:.2rem .6rem;border-radius:999px}
    .feature-badges{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.25rem}
    .fbadge{display:inline-flex;align-items:center;gap:.3rem;font-size:.78rem;font-weight:600;padding:.3rem .7rem;border-radius:999px}
    .badge-terraza{background:#FEF9C3;color:#92400E}
    .badge-musica{background:#EDE9FE;color:#5B21B6}
    .badge-grupos{background:#E0F2FE;color:#0369A1}
    .badge-dogs{background:#FEF3C7;color:#92400E}
    .descripcion{font-size:.95rem;color:#44403C;line-height:1.6;margin-bottom:1.5rem;font-style:italic}
    .photo{width:100%;height:240px;object-fit:cover;border-radius:1.25rem;margin-bottom:1.75rem;display:block}
    .card{background:white;border-radius:1.25rem;border:1px solid #F5E6D3;padding:1.75rem;margin-bottom:1rem}
    .row{display:flex;align-items:flex-start;gap:.75rem;padding:.6rem 0;border-bottom:1px solid #FEF0DC}
    .row:last-child{border-bottom:none}
    .icon{font-size:1.1rem;flex-shrink:0;margin-top:2px}
    .label{font-size:.75rem;color:#78716C;text-transform:uppercase;letter-spacing:.06em}
    .value{font-size:.95rem;color:#1C1917;font-weight:500}
    a.value{color:#FB923C;text-decoration:none}
    a.value:hover{text-decoration:underline}
    .horario-list{font-size:.9rem;color:#1C1917;line-height:1.8}
    .map{margin-top:1rem;border-radius:1.25rem;overflow:hidden;border:1px solid #F5E6D3}
    .back{display:inline-flex;align-items:center;gap:.4rem;color:#78716C;font-size:.875rem;text-decoration:none;margin-top:2rem}
    .back:hover{color:#FB923C}
    footer{text-align:center;padding:2rem 1rem;font-size:.8rem;color:#A8A29E;border-top:1px solid #F5E6D3;margin-top:2rem}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">tres<span>y</span>cuarto</a>
    <a href="${ciudadUrl}" class="back" style="margin:0">← ${esc(local.ciudad)}</a>
  </nav>

  <div class="container">
    ${local.photo_url ? `<img src="${esc(local.photo_url)}" alt="${esc(local.nombre)}" class="photo" loading="eager"/>` : ""}

    <div class="tipo-badge">${esc(tipoLabel(local.tipo))}</div>
    <h1>${esc(local.nombre)}</h1>
    <div class="ciudad-line">📍 ${esc(local.ciudad)}</div>

    ${(local.rating && local.rating > 0) || local.price_level ? `
    <div class="rating-row">
      ${(local.rating && local.rating > 0) ? `
        <span class="stars">${"★".repeat(Math.min(5,Math.round(local.rating)))}${"☆".repeat(Math.max(0,5-Math.round(local.rating)))}</span>
        <span class="rating-num">${local.rating.toFixed(1)}</span>
        ${local.rating_count ? `<span class="rating-count">(${Number(local.rating_count).toLocaleString("es-ES")} reseñas)</span>` : ""}
      ` : ""}
      ${local.price_level ? `<span class="price">${esc(local.price_level)}</span>` : ""}
    </div>` : ""}

    ${featureBadges ? `<div class="feature-badges">${featureBadges}</div>` : ""}
    ${local.descripcion_google ? `<p class="descripcion">"${esc(local.descripcion_google)}"</p>` : ""}

    <div class="card">
      ${local.direccion ? `<div class="row"><span class="icon">🗺️</span><div><div class="label">Dirección</div><div class="value">${esc(local.direccion)}${local.codigo_postal?`, ${esc(local.codigo_postal)}`:""}</div></div></div>` : ""}

      ${(local.horario || local.horario_google) ? `
      <div class="row"><span class="icon">🕒</span><div>
        <div class="label">Horario</div>
        ${local.horario_google
          ? `<div class="horario-list">${local.horario_google.split(" | ").map(d=>`<div>${esc(d)}</div>`).join("")}</div>`
          : `<div class="value">${esc(local.horario)}</div>`}
      </div></div>` : ""}

      ${local.telefono ? `<div class="row"><span class="icon">📞</span><div><div class="label">Teléfono</div><a class="value" href="tel:${esc(local.telefono)}">${esc(local.telefono)}</a></div></div>` : ""}
      ${local.web ? `<div class="row"><span class="icon">🌐</span><div><div class="label">Web</div><a class="value" href="${esc(local.web)}" target="_blank" rel="noopener">${esc(local.web.replace(/^https?:\/\//,""))}</a></div></div>` : ""}
      ${local.instagram ? `<div class="row"><span class="icon">📸</span><div><div class="label">Instagram</div><a class="value" href="https://instagram.com/${esc(local.instagram)}" target="_blank" rel="noopener">@${esc(local.instagram)}</a></div></div>` : ""}
      ${(local.lat && local.lon) ? `<div class="row"><span class="icon">🧭</span><div><div class="label">Cómo llegar</div><a class="value" href="https://maps.google.com/maps?daddr=${local.lat},${local.lon}" target="_blank" rel="noopener">Abrir navegación</a></div></div>` : ""}
    </div>

    ${(local.lat && local.lon) ? `
    <div class="map">
      <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${local.lon-0.005},${local.lat-0.005},${local.lon+0.005},${local.lat+0.005}&layer=mapnik&marker=${local.lat},${local.lon}"
        style="width:100%;height:280px;border:none;display:block" loading="lazy" title="Mapa de ${esc(local.nombre)}"></iframe>
    </div>` : ""}

    ${local.claimed === 1 ? `
    <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:14px;padding:1rem 1.5rem;margin-top:1.5rem;margin-bottom:2rem;display:flex;align-items:center;gap:0.75rem">
      <span style="font-size:1.5rem">✅</span>
      <div>
        <div style="font-weight:700;color:#166534;font-size:0.9rem">Local verificado</div>
        <div style="font-size:0.8rem;color:#4ade80">Este local ha sido reclamado y verificado por su propietario.</div>
      </div>
    </div>` : `
    <div style="background:#fff;border:1.5px dashed #F59E0B;border-radius:14px;padding:1.5rem;margin-top:1.5rem;margin-bottom:2rem">
      <div style="display:flex;gap:1rem;align-items:flex-start">
        <span style="font-size:2rem;line-height:1">🏪</span>
        <div style="flex:1">
          <div style="font-weight:800;font-size:1rem;color:#1C1917;margin-bottom:0.4rem">¿Eres el propietario de ${esc(local.nombre)}?</div>
          <p style="margin:0 0 0.75rem;font-size:0.85rem;color:#78716c;line-height:1.5">Reclama tu ficha gratis y gestiona tu presencia en tresycuarto.</p>
          <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1rem">
            ${["📸 Subir fotos","🕐 Actualizar horarios","📅 Publicar eventos","🎵 Añadir servicios"].map(i=>`<span style="font-size:0.75rem;background:#FEF0DC;color:#FB923C;border-radius:999px;padding:0.2rem 0.7rem;font-weight:600">${i}</span>`).join("")}
          </div>
          <a href="/unete?local=${encodeURIComponent(local.id)}&nombre=${encodeURIComponent(local.nombre)}&ciudad=${encodeURIComponent(local.ciudad)}" style="display:inline-block;background:#F59E0B;color:#fff;border-radius:999px;padding:0.55rem 1.4rem;text-decoration:none;font-weight:700;font-size:0.875rem">Reclamar esta ficha →</a>
        </div>
      </div>
    </div>`}

    <a href="${ciudadUrl}" class="back">← Ver más locales en ${esc(local.ciudad)}</a>
  </div>

  <footer>© 2025 tresycuarto.com — Los mejores locales de tardeo en España</footer>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const rawCiudad  = params.ciudad;
  const slug       = params.slug;

  // Normalizar: decodificar %20 y reemplazar espacios por guiones
  const ciudadSlug = decodeURIComponent(rawCiudad).replace(/\s+/g, "-");
  if (ciudadSlug !== rawCiudad) {
    return Response.redirect(`https://tresycuarto.com/locales/${ciudadSlug}/${slug}`, 301);
  }

  const ciudad = CIUDAD_MAP[ciudadSlug];
  if (!ciudad) {
    return new Response("Ciudad no encontrada", { status: 404 });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM locales WHERE slug = ? AND ciudad = ? LIMIT 1"
  ).bind(slug, ciudad).all();

  if (!results || results.length === 0) {
    const ciudadNombre = ciudad || ciudadSlug;
    const ciudadUrl = `https://tresycuarto.com/locales/${ciudadSlug}`;
    return new Response(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Local no encontrado | tresycuarto</title>
  <meta name="robots" content="noindex"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,sans-serif;background:#FFF8EF;color:#1C1917;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem}
    nav{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid #F5E6D3;background:rgba(255,248,239,0.95);backdrop-filter:blur(8px)}
    .logo{font-weight:900;font-size:1.1rem;color:#1C1917;text-decoration:none}
    .logo span{color:#FB923C}
    .container{max-width:480px;text-align:center;margin-top:4rem}
    .emoji{font-size:4rem;margin-bottom:1rem}
    h1{font-size:1.8rem;font-weight:900;margin-bottom:.75rem}
    p{color:#78716C;line-height:1.6;margin-bottom:1.75rem}
    .btn{display:inline-block;background:#FB923C;color:#fff;border-radius:999px;padding:.65rem 1.5rem;text-decoration:none;font-weight:700;font-size:.9rem}
    .btn:hover{background:#EA7C22}
  </style>
</head>
<body>
  <nav><a href="/" class="logo">tres<span>y</span>cuarto</a></nav>
  <div class="container">
    <div class="emoji">🔍</div>
    <h1>Local no encontrado</h1>
    <p>Este local ya no está disponible o ha cambiado de dirección. Descubre otros locales de tardeo en ${esc(ciudadNombre)}.</p>
    <a href="${ciudadUrl}" class="btn">Ver locales en ${esc(ciudadNombre)} →</a>
  </div>
</body>
</html>`, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response(renderLocal(results[0], ciudadSlug), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
