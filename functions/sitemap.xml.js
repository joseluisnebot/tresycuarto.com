const CIUDADES = ["Madrid","Barcelona","Valencia","Sevilla","Bilbao","Málaga","Zaragoza","Murcia"];

export async function onRequestGet() {
  const hoy = new Date().toISOString().split("T")[0];

  const urls = [
    `<sitemap><loc>https://tresycuarto.com/sitemap-static.xml</loc><lastmod>${hoy}</lastmod></sitemap>`,
    ...CIUDADES.map(c =>
      `<sitemap><loc>https://tresycuarto.com/sitemap-${encodeURIComponent(c.toLowerCase())}.xml</loc><lastmod>${hoy}</lastmod></sitemap>`
    ),
  ].join("\n  ");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
