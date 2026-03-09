const CIUDADES = ["Madrid","Barcelona","Valencia","Sevilla","Bilbao","Málaga","Zaragoza","Murcia"];

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function tipoLabel(tipo) {
  const map = { bar:"Bar", cafe:"Cafetería", pub:"Pub", biergarten:"Terraza" };
  return map[tipo] || tipo;
}

function renderListado(ciudad, locales, total, offset, limit) {
  const pagina = Math.floor(offset / limit) + 1;
  const totalPaginas = Math.ceil(total / limit);
  const prevOffset = offset - limit;
  const nextOffset = offset + limit;

  const cards = locales.map(l => `
    <a href="/locales/${escHtml(l.id)}" class="card">
      <div class="card-top">
        <span class="badge">${escHtml(tipoLabel(l.tipo))}</span>
        ${l.terraza ? '<span class="terraza-badge">☀️ Terraza</span>' : ""}
      </div>
      <h2>${escHtml(l.nombre)}</h2>
      ${l.direccion ? `<p class="dir">📍 ${escHtml(l.direccion)}</p>` : ""}
      ${l.horario ? `<p class="hora">🕒 ${escHtml(l.horario)}</p>` : ""}
    </a>`).join("");

  const selectorCiudades = CIUDADES.map(c =>
    `<a href="/locales?ciudad=${encodeURIComponent(c)}" class="ciudad-pill ${c === ciudad ? "active" : ""}">${escHtml(c)}</a>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tardeo en ${escHtml(ciudad)} — Bares y locales de tarde | tresycuarto</title>
  <meta name="description" content="Descubre los mejores bares, cafés y terrazas para tardeear en ${escHtml(ciudad)}. ${total} locales mapeados."/>
  <link rel="canonical" href="https://tresycuarto.com/locales?ciudad=${encodeURIComponent(ciudad)}"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#FFF8EF;color:#1C1917;min-height:100vh}
    nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid #F5E6D3;background:rgba(255,248,239,0.95);position:sticky;top:0;backdrop-filter:blur(8px);z-index:10}
    nav a.logo{text-decoration:none;font-size:1.2rem;font-weight:800;letter-spacing:-0.03em;color:#1C1917}
    .container{max-width:900px;margin:0 auto;padding:2rem 1.5rem}
    h1{font-size:clamp(1.6rem,4vw,2.2rem);font-weight:900;letter-spacing:-0.03em;margin-bottom:0.4rem}
    .subtitle{color:#78716C;font-size:1rem;margin-bottom:1.75rem}
    .ciudades{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:2rem}
    .ciudad-pill{text-decoration:none;font-size:0.82rem;font-weight:600;padding:0.35rem 0.9rem;border-radius:999px;background:#EDE9FE;color:#7C3AED;border:1.5px solid transparent;transition:all .15s}
    .ciudad-pill.active,.ciudad-pill:hover{background:#7C3AED;color:white}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin-bottom:2rem}
    .card{display:block;text-decoration:none;background:white;border-radius:1.25rem;border:1px solid #F5E6D3;padding:1.25rem;transition:box-shadow .15s,transform .15s;color:inherit}
    .card:hover{box-shadow:0 8px 24px rgba(0,0,0,0.08);transform:translateY(-2px)}
    .card-top{display:flex;gap:0.4rem;margin-bottom:0.6rem;flex-wrap:wrap}
    .badge{font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FB923C;background:#FEF0DC;padding:0.25rem 0.6rem;border-radius:999px}
    .terraza-badge{font-size:0.68rem;font-weight:700;color:#059669;background:#D1FAE5;padding:0.25rem 0.6rem;border-radius:999px}
    .card h2{font-size:1rem;font-weight:700;margin-bottom:0.4rem;line-height:1.3}
    .dir,.hora{font-size:0.8rem;color:#78716C;margin-top:0.25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .paginacion{display:flex;align-items:center;justify-content:center;gap:1rem;padding:1rem 0}
    .paginacion a{text-decoration:none;color:#FB923C;font-weight:600;font-size:0.9rem}
    .paginacion span{color:#78716C;font-size:0.875rem}
    footer{text-align:center;padding:2rem 1rem;font-size:0.8rem;color:#A8A29E;border-top:1px solid #F5E6D3;margin-top:1rem}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">tres<span style="color:#FB923C">y</span>cuarto</a>
    <span style="font-size:0.7rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#FB923C;background:#FEF0DC;padding:0.25rem 0.75rem;border-radius:999px">Tardeo</span>
  </nav>

  <div class="container">
    <h1>Tardeo en ${escHtml(ciudad)}</h1>
    <p class="subtitle">${total} locales mapeados — bares, cafés, pubs y terrazas</p>

    <div class="ciudades">${selectorCiudades}</div>

    <div class="grid">${cards}</div>

    <div class="paginacion">
      ${prevOffset >= 0 ? `<a href="/locales?ciudad=${encodeURIComponent(ciudad)}&offset=${prevOffset}">← Anterior</a>` : "<span></span>"}
      <span>Página ${pagina} de ${totalPaginas}</span>
      ${nextOffset < total ? `<a href="/locales?ciudad=${encodeURIComponent(ciudad)}&offset=${nextOffset}">Siguiente →</a>` : "<span></span>"}
    </div>
  </div>

  <footer>© 2025 tresycuarto.com — Los mejores locales de tardeo en España</footer>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const ciudad = url.searchParams.get("ciudad") || "Madrid";
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  const limit = 48;

  const [{ results: locales }, { results: countRes }] = await Promise.all([
    env.DB.prepare("SELECT * FROM locales WHERE ciudad = ? ORDER BY nombre LIMIT ? OFFSET ?")
      .bind(ciudad, limit, offset).all(),
    env.DB.prepare("SELECT COUNT(*) as total FROM locales WHERE ciudad = ?")
      .bind(ciudad).all(),
  ]);

  const total = countRes[0].total;

  return new Response(renderListado(ciudad, locales, total, offset, limit), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
