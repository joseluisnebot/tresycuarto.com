const CIUDADES_MAP = {
  "madrid": "Madrid",
  "barcelona": "Barcelona",
  "valencia": "Valencia",
  "sevilla": "Sevilla",
  "bilbao": "Bilbao",
  "málaga": "Málaga",
  "m%c3%a1laga": "Málaga",
  "malaga": "Málaga",
  "zaragoza": "Zaragoza",
  "murcia": "Murcia",
  "cádiz": "Cádiz",
  "cadiz": "Cádiz",
  "c%c3%a1diz": "Cádiz",
  "cartagena": "Cartagena",
  "córdoba": "Córdoba",
  "cordoba": "Córdoba",
  "c%c3%b3rdoba": "Córdoba",
  "cuenca": "Cuenca",
  "granada": "Granada",
  "jerez de la frontera": "Jerez de la Frontera",
  "jerez": "Jerez de la Frontera",
  "jerez-de-la-frontera": "Jerez de la Frontera",
  "le%c3%b3n": "León",
  "león": "León",
  "leon": "León",
  "lorca": "Lorca",
  "valladolid": "Valladolid",
  "zamora": "Zamora",
};

export async function onRequestGet(context) {
  const { env, params } = context;
  const ciudadSlug = params.ciudad.toLowerCase();
  const ciudad = CIUDADES_MAP[ciudadSlug];

  if (!ciudad) {
    return new Response("Not found", { status: 404 });
  }

  const hoy = new Date().toISOString().split("T")[0];
  const { results } = await env.DB.prepare(
    "SELECT id FROM locales WHERE ciudad = ? ORDER BY nombre"
  ).bind(ciudad).all();

  const urls = results.map(l =>
    `<url><loc>https://tresycuarto.com/locales/${encodeURIComponent(l.id)}</loc><changefreq>monthly</changefreq><priority>0.6</priority><lastmod>${hoy}</lastmod></url>`
  ).join("\n  ");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
