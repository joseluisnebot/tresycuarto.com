const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function onRequestGet({ request, env }) {
  const url   = new URL(request.url);
  const email = url.searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return Response.json({ error: "Email requerido" }, { status: 400, headers: CORS });
  }

  const row = await env.DB.prepare(
    "SELECT email, ciudad, ciudades FROM leads_app WHERE email=?"
  ).bind(email).first();

  if (!row) {
    return Response.json({ existe: false, ciudades: [] }, { headers: CORS });
  }

  let ciudades = [];
  if (row.ciudades) {
    try { ciudades = JSON.parse(row.ciudades); } catch { ciudades = []; }
  } else if (row.ciudad) {
    ciudades = [row.ciudad];
  }

  return Response.json({ existe: true, ciudades }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
}
