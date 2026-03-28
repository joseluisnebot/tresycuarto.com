const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const LISTMONK_URL  = "https://listmonk.tresycuarto.com";
const LISTMONK_USER = "tresycuarto";
const LISTMONK_PASS = "uGsFIP9aSpVW3ctCu6Ju32Hh5Jlhvbhl";

async function buscarEnListmonk(email) {
  try {
    const auth = btoa(`${LISTMONK_USER}:${LISTMONK_PASS}`);
    const res = await fetch(
      `${LISTMONK_URL}/api/subscribers?query=email%3D'${encodeURIComponent(email)}'&per_page=1`,
      { headers: { "Authorization": `Basic ${auth}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.results?.[0] || null;
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  const url   = new URL(request.url);
  const email = url.searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return Response.json({ error: "Email requerido" }, { status: 400, headers: CORS });
  }

  // 1. Buscar en leads_app (D1)
  const row = await env.DB.prepare(
    "SELECT email, ciudad, ciudades FROM leads_app WHERE email=?"
  ).bind(email).first();

  if (row) {
    let ciudades = [];
    if (row.ciudades) {
      try { ciudades = JSON.parse(row.ciudades); } catch { ciudades = []; }
    } else if (row.ciudad) {
      ciudades = [row.ciudad];
    }
    return Response.json({ existe: true, ciudades }, { headers: CORS });
  }

  // 2. Si no está en D1, buscar en Listmonk (registrados desde la web)
  const sub = await buscarEnListmonk(email);
  if (!sub) {
    return Response.json({ existe: false, ciudades: [] }, { headers: CORS });
  }

  const attribs = sub.attribs || {};
  let ciudades = attribs.ciudades || [];
  if (!ciudades.length && attribs.ciudad) ciudades = [attribs.ciudad];

  return Response.json({ existe: true, ciudades }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
}
