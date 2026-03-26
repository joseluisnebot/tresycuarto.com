import CITIES from "../../../data/cities.json";

export async function onRequestGet() {
  const ciudades = CITIES.map(c => ({ slug: c.slug, nombre: c.name }));
  return Response.json({ ciudades }, {
    headers: { "Access-Control-Allow-Origin": "*" }
  });
}
