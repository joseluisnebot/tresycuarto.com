const CIUDADES = ["Madrid","Barcelona","Valencia","Sevilla","Bilbao","Málaga","Zaragoza","Murcia"];

export async function onRequestGet() {
  const hoy = new Date().toISOString().split("T")[0];

  const urls = [
    `<url><loc>https://tresycuarto.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    ...CIUDADES.map(c =>
      `<url><loc>https://tresycuarto.com/locales?ciudad=${encodeURIComponent(c)}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${hoy}</lastmod></url>`
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
