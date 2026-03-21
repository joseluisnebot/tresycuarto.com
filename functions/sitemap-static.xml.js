const CIUDADES = [
  { nombre: "Madrid", slug: "madrid" },
  { nombre: "Barcelona", slug: "barcelona" },
  { nombre: "Valencia", slug: "valencia" },
  { nombre: "Sevilla", slug: "sevilla" },
  { nombre: "Bilbao", slug: "bilbao" },
  { nombre: "Málaga", slug: "malaga" },
  { nombre: "Zaragoza", slug: "zaragoza" },
  { nombre: "Murcia", slug: "murcia" },
  { nombre: "Cádiz", slug: "cadiz" },
  { nombre: "Cartagena", slug: "cartagena" },
  { nombre: "Córdoba", slug: "cordoba" },
  { nombre: "Cuenca", slug: "cuenca" },
  { nombre: "Granada", slug: "granada" },
  { nombre: "Jerez de la Frontera", slug: "jerez-de-la-frontera" },
  { nombre: "León", slug: "leon" },
  { nombre: "Lorca", slug: "lorca" },
  { nombre: "Valladolid", slug: "valladolid" },
  { nombre: "Zamora", slug: "zamora" },
];

export async function onRequestGet() {
  const hoy = new Date().toISOString().split("T")[0];

  const urls = [
    `<url><loc>https://tresycuarto.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    ...CIUDADES.map(c =>
      `<url><loc>https://tresycuarto.com/locales/${c.slug}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${hoy}</lastmod></url>`
    ),
  ].join("\n  ");

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
