// Sitemap — solo páginas reales con contenido indexable.
// NUNCA incluir: fichas individuales de locales (osm_node_*), URLs /tardeo/, URLs /rutas/
// si esas páginas no existen. Incluirlas genera miles de 404 y quema crawl budget.

const CIUDAD_SLUGS = [
  "albacete","alcala-de-henares","algeciras","almeria","altea","arona","avila",
  "badajoz","barakaldo","barcelona","benidorm","bilbao","burgos","caceres","cadiz",
  "cartagena","ciudad-real","cordoba","cuenca","cullera","denia","getafe","girona",
  "granada","guadalajara","huelva","huesca","jaen","jerez-de-la-frontera","la-coruna",
  "las-palmas","leganes","leon","lleida","logrono","lorca","lugo","madrid","malaga",
  "mostoles","murcia","oviedo","palencia","palma","pamplona","pontevedra","salamanca",
  "san-sebastian","santa-cruz-de-tenerife","santa-pola","santander","segovia","sevilla",
  "soria","tarragona","teruel","toledo","torrevieja","valencia","valladolid","vinaros",
  "vitoria","zamora","zaragoza"
];

export async function onRequestGet(context) {
  const hoy = new Date().toISOString().split("T")[0];

  const urls = [
    // Páginas estáticas principales
    `<url><loc>https://tresycuarto.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${hoy}</lastmod></url>`,
    `<url><loc>https://tresycuarto.com/eventos</loc><changefreq>daily</changefreq><priority>0.7</priority><lastmod>${hoy}</lastmod></url>`,
    `<url><loc>https://tresycuarto.com/faq</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${hoy}</lastmod></url>`,
    `<url><loc>https://tresycuarto.com/privacidad</loc><changefreq>monthly</changefreq><priority>0.3</priority><lastmod>${hoy}</lastmod></url>`,
    // Páginas de ciudad (64 URLs — contenido real con locales, FAQs, rutas)
    ...CIUDAD_SLUGS.map(slug =>
      `<url><loc>https://tresycuarto.com/locales/${slug}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${hoy}</lastmod></url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join("\n  ")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
