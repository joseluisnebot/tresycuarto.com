import CITIES from "../../../data/cities.json";

const SLUG_TO_CIUDAD = Object.fromEntries(CITIES.map(c => [c.slug, c.nombre]));
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export async function onRequestGet({ request, env }) {
  const url      = new URL(request.url);
  const ciudadSl = url.searchParams.get("ciudad");
  const slug     = url.searchParams.get("slug");
  const ciudad   = SLUG_TO_CIUDAD[ciudadSl];

  if (!ciudad || !slug) return Response.json({ error: "Parámetros inválidos" }, { status: 400, headers: CORS });

  const { results } = await env.DB.prepare(
    "SELECT * FROM locales WHERE slug=? AND ciudad=? LIMIT 1"
  ).bind(slug, ciudad).all();

  if (!results.length) return Response.json({ error: "Local no encontrado" }, { status: 404, headers: CORS });

  return Response.json({ local: results[0] }, { headers: CORS });
}
