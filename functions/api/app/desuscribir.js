const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const LISTMONK_URL  = "https://listmonk.tresycuarto.com";
const LISTMONK_USER = "tresycuarto";
const LISTMONK_PASS = "uGsFIP9aSpVW3ctCu6Ju32Hh5Jlhvbhl";

async function listmonkRequest(method, path, body, env) {
  try {
    const auth = btoa(`${LISTMONK_USER}:${LISTMONK_PASS}`);
    const headers = { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" };
    if (env?.CF_ACCESS_CLIENT_ID) {
      headers["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
      headers["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
    }
    const res = await fetch(`${LISTMONK_URL}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    const text = await res.text();
    try { return JSON.parse(text); } catch { return null; }
  } catch { return null; }
}

async function syncListmonk(email, ciudades, env) {
  const search = await listmonkRequest("GET", `/api/subscribers?query=email%3D'${encodeURIComponent(email)}'&per_page=1`, null, env);
  const existing = search?.data?.results?.[0];
  if (!existing) return;
  const attribs = { ...(existing.attribs || {}), ciudades };
  await listmonkRequest("PUT", `/api/subscribers/${existing.id}`, {
    email, name: existing.name || email.split("@")[0],
    lists: [3], attribs, status: "enabled",
  }, env);
}

export async function onRequestPost({ request, env, waitUntil }) {
  let email, ciudad;
  try {
    ({ email, ciudad } = await request.json());
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400, headers: CORS });
  }

  if (!email || !ciudad) {
    return Response.json({ error: "Email y ciudad requeridos" }, { status: 400, headers: CORS });
  }

  email = email.toLowerCase().trim();

  const existing = await env.DB.prepare(
    "SELECT email, ciudades, ciudad FROM leads_app WHERE email=?"
  ).bind(email).first();

  if (!existing) {
    return Response.json({ ok: true, ciudades: [] }, { headers: CORS });
  }

  let ciudadesActuales = [];
  if (existing.ciudades) {
    try { ciudadesActuales = JSON.parse(existing.ciudades); } catch { ciudadesActuales = []; }
  } else if (existing.ciudad) {
    ciudadesActuales = [existing.ciudad];
  }

  ciudadesActuales = ciudadesActuales.filter(c => c !== ciudad);

  await env.DB.prepare(
    "UPDATE leads_app SET ciudades=?, ciudad=? WHERE email=?"
  ).bind(JSON.stringify(ciudadesActuales), ciudadesActuales[0] || null, email).run();

  waitUntil(syncListmonk(email, ciudadesActuales, env).catch(() => {}));

  return Response.json({ ok: true, ciudades: ciudadesActuales }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
