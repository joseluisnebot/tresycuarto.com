import CITIES from "../../../data/cities.json";

const SLUG_TO_CIUDAD = Object.fromEntries(CITIES.map(c => [c.slug, c.name]));
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url);
  const slug   = url.searchParams.get("ciudad");
  const ciudad = slug ? SLUG_TO_CIUDAD[slug] : null;
  const hoy    = new Date().toISOString().split("T")[0];

  const where  = ciudad ? "AND ciudad=?" : "";
  const params = ciudad ? [hoy, ciudad] : [hoy];

  const { results: eventos } = await env.DB.prepare(
    `SELECT id, nombre, tipo, ciudad, fecha, hora_inicio, direccion, descripcion, lat, lon
     FROM eventos_geo WHERE estado='aprobado' AND fecha >= ? ${where}
     ORDER BY fecha ASC, hora_inicio ASC LIMIT 50`
  ).bind(...params).all();

  return Response.json({ eventos }, { headers: CORS });
}
