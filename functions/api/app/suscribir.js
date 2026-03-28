const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const LISTMONK_URL  = "https://listmonk.tresycuarto.com";
const LISTMONK_USER = "tresycuarto";
const LISTMONK_PASS = "uGsFIP9aSpVW3ctCu6Ju32Hh5Jlhvbhl";
const LISTMONK_LIST = 3;

async function listmonkRequest(method, path, body) {
  try {
    const auth = btoa(`${LISTMONK_USER}:${LISTMONK_PASS}`);
    const res = await fetch(`${LISTMONK_URL}${path}`, {
      method,
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    const text = await res.text();
    try { return JSON.parse(text); } catch { return null; }
  } catch { return null; }
}

async function syncListmonk(email, ciudades) {
  // Buscar suscriptor existente
  const search = await listmonkRequest("GET", `/api/subscribers?query=email%3D'${encodeURIComponent(email)}'&per_page=1`);
  const existing = search?.data?.results?.[0];

  if (existing) {
    // Actualizar atributos manteniendo los existentes
    const attribs = { ...(existing.attribs || {}), ciudades };
    await listmonkRequest("PUT", `/api/subscribers/${existing.id}`, {
      email, name: existing.name || email.split("@")[0],
      lists: [LISTMONK_LIST], attribs, status: "enabled",
    });
  } else {
    // Crear nuevo suscriptor
    await listmonkRequest("POST", "/api/subscribers", {
      email, name: email.split("@")[0],
      lists: [LISTMONK_LIST], attribs: { ciudades }, status: "enabled",
      preconfirm_subscriptions: true,
    });
  }
}

async function sendWelcome(email, ciudad, brevoKey) {
  const body = {
    sender: { name: "tresycuarto", email: "hola@tresycuarto.com" },
    to: [{ email }],
    subject: "¡Ya estás dentro! 🍊 tresycuarto",
    htmlContent: `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#FFF8EF;margin:0;padding:32px 16px">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:32px;border:1px solid #F5E6D3">
  <div style="font-size:1.4rem;font-weight:900;color:#1C1917;margin-bottom:24px">tres<span style="color:#FB923C">y</span>cuarto 🍊</div>
  <h1 style="font-size:1.3rem;font-weight:800;color:#1C1917;margin:0 0 12px">¡Bienvenido al tardeo!</h1>
  <p style="color:#57534E;line-height:1.6;margin:0 0 16px">
    Ya eres parte de tresycuarto. Te avisaremos de los mejores planes${ciudad ? ` en <strong>${ciudad}</strong>` : ""} para que no te pierdas nada.
  </p>
  <a href="https://tresycuarto.com" style="display:inline-block;background:#FB923C;color:white;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none">
    Ver locales →
  </a>
</div>
</body></html>`,
  };
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevoKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function onRequestPost({ request, env }) {
  let email, ciudad;
  try {
    ({ email, ciudad } = await request.json());
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400, headers: CORS });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Email no válido" }, { status: 400, headers: CORS });
  }

  email = email.toLowerCase().trim();
  const now = new Date().toISOString();

  // Buscar si ya existe el email
  const existing = await env.DB.prepare(
    "SELECT email, ciudades, ciudad FROM leads_app WHERE email=?"
  ).bind(email).first();

  let ciudadesActuales = [];
  let esNuevo = false;

  if (existing) {
    // Parsear ciudades existentes
    if (existing.ciudades) {
      try { ciudadesActuales = JSON.parse(existing.ciudades); } catch { ciudadesActuales = []; }
    } else if (existing.ciudad) {
      ciudadesActuales = [existing.ciudad];
    }
    // Añadir nueva ciudad si no está ya
    if (ciudad && !ciudadesActuales.includes(ciudad)) {
      ciudadesActuales.push(ciudad);
    }
    await env.DB.prepare(
      "UPDATE leads_app SET ciudades=?, ciudad=? WHERE email=?"
    ).bind(JSON.stringify(ciudadesActuales), ciudadesActuales[0] || null, email).run();
  } else {
    esNuevo = true;
    ciudadesActuales = ciudad ? [ciudad] : [];
    await env.DB.prepare(
      "INSERT INTO leads_app (email, ciudad, ciudades, created_at) VALUES (?, ?, ?, ?)"
    ).bind(email, ciudad || null, JSON.stringify(ciudadesActuales), now).run();
  }

  // Sincronizar con Listmonk (fire and forget)
  syncListmonk(email, ciudadesActuales).catch(() => {});

  // Enviar bienvenida solo si es nuevo
  if (esNuevo) {
    sendWelcome(email, ciudad, env.BREVO_API_KEY).catch(() => {});
  }

  return Response.json({ ok: true, ciudades: ciudadesActuales }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
