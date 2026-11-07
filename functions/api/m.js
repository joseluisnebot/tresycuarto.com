/**
 * m.js — Recibe los eventos del embudo que envía /m.js y los guarda en Analytics
 * Engine (dataset "tresycuarto_embudo"). Sin cookies ni datos personales: no se
 * guarda la IP, solo el país que da Cloudflare.
 *
 * Columnas: blob1=evento, blob2=ruta, blob3=tipo de página, blob4=país, blob5=extra,
 *           double1=1 (para sumar), index1=evento.
 */

const EVENTOS = new Set(["vista", "form_visto", "form_enviado", "clic_local"]);
const BOTS = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternal|preview|headless|lighthouse|pingdom|uptime/i;

export function tipoPagina(path) {
  if (path === "/" || path === "") return "home";
  if (path.startsWith("/rutas/")) return "ruta";
  if (/^\/locales\/[^/]+\/[^/]+/.test(path)) return "ficha";
  if (path.startsWith("/locales/")) return "ciudad";
  if (path.startsWith("/tardeo/")) return "tardeo";
  if (path.startsWith("/terrazas/")) return "terrazas";
  if (path.startsWith("/eventos")) return "eventos";
  return "otra";
}

export async function onRequestPost({ request, env }) {
  if (!env.EMBUDO || BOTS.test(request.headers.get("User-Agent") || "")) {
    return new Response(null, { status: 204 });
  }
  let d;
  try { d = JSON.parse(await request.text()); } catch { return new Response(null, { status: 204 }); }
  if (!EVENTOS.has(d.e)) return new Response(null, { status: 204 });

  const path = String(d.p || "").slice(0, 200);
  env.EMBUDO.writeDataPoint({
    blobs: [d.e, path, tipoPagina(path), request.cf?.country || "", String(d.x || "").slice(0, 200)],
    doubles: [1],
    indexes: [d.e],
  });
  return new Response(null, { status: 204 });
}
