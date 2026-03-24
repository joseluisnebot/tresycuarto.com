const CIUDADES = [
  "Albacete","Alcalá de Henares","Algeciras","Almería","Altea","Arona","Ávila","Badajoz","Barakaldo","Barcelona","Benidorm","Bilbao","Burgos","Cáceres","Cádiz","Cartagena","Ciudad Real","Córdoba","Cuenca","Cullera","Dénia","Getafe","Girona","Granada","Guadalajara","Huelva","Huesca","Jaén","Jerez de la Frontera","La Coruña","Las Palmas","Leganés","León","Lleida","Logroño","Lorca","Lugo","Madrid","Málaga","Móstoles","Murcia","Oviedo","Palencia","Palma","Pontevedra","Salamanca","San Sebastián","Santa Cruz de Tenerife","Santa Pola","Santander","Segovia","Sevilla","Soria","Tarragona","Teruel","Toledo","Torrevieja","Valencia","Valladolid","Vinaròs","Vitoria","Zamora","Zaragoza"
];

const TIPOS_SLUG = ["bares", "pubs", "cafeterias", "terrazas", "tardeo", "planes-tarde", "terraza-tarde"];
const RUTAS_SLUGS = ["tardeo-malasana-madrid", "tardeo-la-latina-madrid", "tardeo-lavapies-madrid", "tardeo-chueca-madrid", "tardeo-gracia-barcelona", "tardeo-el-born-barcelona", "tardeo-ruzafa-valencia", "tardeo-el-carmen-valencia", "tardeo-triana-sevilla", "tardeo-alameda-sevilla"];
const CIUDAD_SLUGS = ["albacete", "alcala-de-henares", "algeciras", "almeria", "altea", "arona", "avila", "badajoz", "barakaldo", "barcelona", "benidorm", "bilbao", "burgos", "caceres", "cadiz", "cartagena", "ciudad-real", "cordoba", "cuenca", "cullera", "denia", "getafe", "girona", "granada", "guadalajara", "huelva", "huesca", "jaen", "jerez-de-la-frontera", "la-coruna", "las-palmas", "leganes", "leon", "lleida", "logrono", "lorca", "lugo", "madrid", "malaga", "mostoles", "murcia", "oviedo", "palencia", "palma", "pontevedra", "salamanca", "san-sebastian", "santa-cruz-de-tenerife", "santa-pola", "santander", "segovia", "sevilla", "soria", "tarragona", "teruel", "toledo", "torrevieja", "valencia", "valladolid", "vinaros", "vitoria", "zamora", "zaragoza"];


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

  const tardeoUrls = CIUDAD_SLUGS.flatMap(slug =>
    TIPOS_SLUG.map(tipo =>
      `<url><loc>https://tresycuarto.com/tardeo/${tipo}-en-${slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority><lastmod>${hoy}</lastmod></url>`
    )
  );

  const rutaUrls = RUTAS_SLUGS.map(slug =>
    `<url><loc>https://tresycuarto.com/rutas/${slug}</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${hoy}</lastmod></url>`
  );

  const staticUrls = [
    `<url><loc>https://tresycuarto.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${hoy}</lastmod></url>`,
    `<url><loc>https://tresycuarto.com/eventos</loc><changefreq>daily</changefreq><priority>0.7</priority><lastmod>${hoy}</lastmod></url>`,
    ...CIUDADES.map(c =>
      `<url><loc>https://tresycuarto.com/locales/${ciudadSlug(c)}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${hoy}</lastmod></url>`
    ),
    ...tardeoUrls,
    ...rutaUrls,
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
