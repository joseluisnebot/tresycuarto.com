import CITIES from "../../../data/cities.json";

const SLUG_TO_CIUDAD = Object.fromEntries(CITIES.map(c => [c.slug, c.name]));
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url);
  const slug   = url.searchParams.get("ciudad");
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  const limit  = 30;

  const ciudad = SLUG_TO_CIUDAD[slug];
  if (!ciudad) return Response.json({ error: "Ciudad no encontrada" }, { status: 404, headers: CORS });

  const filters = [];
  if (url.searchParams.get("terraza") === "1") filters.push("(terraza=1 OR outdoor_seating=1)");
  if (url.searchParams.get("grupos")  === "1") filters.push("good_for_groups=1");
  if (url.searchParams.get("perros")  === "1") filters.push("allows_dogs=1");
  const where = filters.length ? `AND ${filters.join(" AND ")}` : "";

  const [{ results: locales }, { results: countRes }] = await Promise.all([
    env.DB.prepare(
      `SELECT id, nombre, tipo, ciudad, slug, direccion, horario, horario_google,
              telefono, web, instagram, terraza, outdoor_seating, live_music,
              good_for_groups, allows_dogs, lat, lon, photo_url, rating,
              rating_count, price_level, descripcion_google
       FROM locales WHERE ciudad=? ${where}
       ORDER BY rating DESC NULLS LAST, nombre LIMIT ? OFFSET ?`
    ).bind(ciudad, limit, offset).all(),
    env.DB.prepare(`SELECT COUNT(*) as total FROM locales WHERE ciudad=? ${where}`)
      .bind(ciudad).all(),
  ]);

  return Response.json({ locales, total: countRes[0].total, offset, limit }, { headers: CORS });
}
