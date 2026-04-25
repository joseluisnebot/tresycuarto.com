// Sitemap — solo páginas reales con contenido indexable.
// - Páginas estáticas + 64 ciudades (siempre)
// - Fichas de locales enriquecidos: slug + rating > 0 + photo_url (URLs limpias)
// NUNCA incluir: osm_node_* directos, /tardeo/, /rutas/ inexistentes

const CIUDAD_SLUGS = [
  "albacete","alcala-de-henares","algeciras","almeria","altea","arona","avila",
  "badajoz","barakaldo","barcelona","benidorm","bilbao","burgos","caceres","cadiz",
  "cartagena","ciudad-real","cordoba","cuenca","cullera","denia","getafe","girona",
  "granada","guadalajara","huelva","huesca","jaen","jerez-de-la-frontera","la-coruna",
  "las-palmas","leganes","leon","lleida","logrono","lorca","lugo","madrid","malaga",
  "mostoles","murcia","oviedo","palencia","palma","pamplona","pontevedra","salamanca",
  "san-sebastian","santa-cruz-de-tenerife","santa-pola","santander","segovia","sevilla",
  "soria","tarragona","teruel","toledo","torrevieja","valencia","valladolid","vinaros",
  "vitoria","zamora","zaragoza",
  "alicante","vigo","gijon","hospitalet-de-llobregat","badalona","elche",
  "sabadell","terrassa","alcorcon","fuenlabrada","mataro","reus","manresa","castello-de-la-plana",
  "gandia","torrent","orihuela","alcoy","merida","molina-de-segura","velez-malaga","linares"
];

const CIUDAD_TO_SLUG = {
  "Albacete":"albacete","Alcalá de Henares":"alcala-de-henares","Algeciras":"algeciras",
  "Almería":"almeria","Altea":"altea","Arona":"arona","Ávila":"avila",
  "Badajoz":"badajoz","Barakaldo":"barakaldo","Barcelona":"barcelona","Benidorm":"benidorm",
  "Bilbao":"bilbao","Burgos":"burgos","Cáceres":"caceres","Cádiz":"cadiz",
  "Cartagena":"cartagena","Ciudad Real":"ciudad-real","Córdoba":"cordoba","Cuenca":"cuenca",
  "Cullera":"cullera","Dénia":"denia","Getafe":"getafe","Girona":"girona",
  "Granada":"granada","Guadalajara":"guadalajara","Huelva":"huelva","Huesca":"huesca",
  "Jaén":"jaen","Jerez de la Frontera":"jerez-de-la-frontera","La Coruña":"la-coruna",
  "Las Palmas":"las-palmas","Leganés":"leganes","León":"leon","Lleida":"lleida",
  "Logroño":"logrono","Lorca":"lorca","Lugo":"lugo","Madrid":"madrid","Málaga":"malaga",
  "Móstoles":"mostoles","Murcia":"murcia","Oviedo":"oviedo","Palencia":"palencia",
  "Palma":"palma","Pamplona":"pamplona","Pontevedra":"pontevedra","Salamanca":"salamanca",
  "San Sebastián":"san-sebastian","Santa Cruz de Tenerife":"santa-cruz-de-tenerife",
  "Santa Pola":"santa-pola","Santander":"santander","Segovia":"segovia","Sevilla":"sevilla",
  "Soria":"soria","Tarragona":"tarragona","Teruel":"teruel","Toledo":"toledo",
  "Torrevieja":"torrevieja","Valencia":"valencia","Valladolid":"valladolid",
  "Vinaròs":"vinaros","Vitoria":"vitoria","Zamora":"zamora","Zaragoza":"zaragoza",
  "Alicante":"alicante","Vigo":"vigo","Gijón":"gijon",
  "Hospitalet de Llobregat":"hospitalet-de-llobregat","Badalona":"badalona","Elche":"elche",
  "Sabadell":"sabadell","Terrassa":"terrassa","Alcorcón":"alcorcon","Fuenlabrada":"fuenlabrada",
  "Mataró":"mataro","Reus":"reus","Manresa":"manresa","Castelló de la Plana":"castello-de-la-plana",
  "Gandia":"gandia","Torrent":"torrent","Orihuela":"orihuela","Alcoy":"alcoy",
  "Mérida":"merida","Molina de Segura":"molina-de-segura","Vélez-Málaga":"velez-malaga","Linares":"linares",
};

export async function onRequestGet(context) {
  const { env } = context;
  const hoy = new Date().toISOString().split("T")[0];

  // Fichas de locales enriquecidos con URL limpia
  const { results: locales } = await env.DB.prepare(
    `SELECT ciudad, slug FROM locales
     WHERE slug IS NOT NULL AND slug != ''
       AND rating IS NOT NULL AND rating > 0
       AND photo_url IS NOT NULL
     ORDER BY ciudad, slug`
  ).all();

  const urlsLocales = locales
    .filter(l => CIUDAD_TO_SLUG[l.ciudad])
    .map(l =>
      `<url><loc>https://tresycuarto.com/locales/${CIUDAD_TO_SLUG[l.ciudad]}/${l.slug}</loc><changefreq>monthly</changefreq><priority>0.6</priority><lastmod>${hoy}</lastmod></url>`
    );

  const urls = [
    `<url><loc>https://tresycuarto.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${hoy}</lastmod></url>`,
    `<url><loc>https://tresycuarto.com/eventos</loc><changefreq>daily</changefreq><priority>0.7</priority><lastmod>${hoy}</lastmod></url>`,
    `<url><loc>https://tresycuarto.com/faq</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${hoy}</lastmod></url>`,
    `<url><loc>https://tresycuarto.com/privacidad</loc><changefreq>monthly</changefreq><priority>0.3</priority><lastmod>${hoy}</lastmod></url>`,
    ...CIUDAD_SLUGS.map(slug =>
      `<url><loc>https://tresycuarto.com/locales/${slug}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${hoy}</lastmod></url>`
    ),
    ...urlsLocales,
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
