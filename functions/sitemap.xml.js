const CIUDADES = [
  "Madrid","Barcelona","Valencia","Sevilla","Bilbao","Málaga","Zaragoza","Murcia",
  "Cádiz","Cartagena","Córdoba","Cuenca","Granada","Jerez de la Frontera",
  "León","Lorca","Valladolid","Zamora",
];

function ciudadSlug(ciudad) {
  return ciudad.toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i").replace(/ó/g,"o").replace(/ú/g,"u")
    .replace(/ü/g,"u").replace(/ñ/g,"n").replace(/\s+/g,"-");
}

export async function onRequestGet(context) {
  const { env } = context;
  const hoy = new Date().toISOString().split("T")[0];

  // Obtener todos los locales de todas las ciudades
  const { results: locales } = await env.DB.prepare(
    "SELECT id, ciudad FROM locales ORDER BY ciudad, nombre"
  ).all();

  const staticUrls = [
    `<url><loc>https://tresycuarto.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${hoy}</lastmod></url>`,
    ...CIUDADES.map(c =>
      `<url><loc>https://tresycuarto.com/locales/${ciudadSlug(c)}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${hoy}</lastmod></url>`
    ),
  ];

  const localUrls = locales.map(l =>
    `<url><loc>https://tresycuarto.com/locales/${encodeURIComponent(l.id)}</loc><changefreq>monthly</changefreq><priority>0.6</priority><lastmod>${hoy}</lastmod></url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${[...staticUrls, ...localUrls].join("\n  ")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
