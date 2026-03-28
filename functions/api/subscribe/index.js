const LISTMONK_URL = "https://listmonk.tresycuarto.com";
const LISTMONK_LIST_ID = 3;

async function verifyTurnstile(token, secret, ip) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}&remoteip=${ip}`,
  });
  const data = await res.json();
  return data.success === true;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { email, ciudad, ciudades, cf_token } = body;

  if (env.TURNSTILE_SECRET) {
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const ok = await verifyTurnstile(cf_token || "", env.TURNSTILE_SECRET, ip);
    if (!ok) return Response.json({ error: "Verificación fallida, inténtalo de nuevo" }, { status: 403 });
  }
  // proximamente=true cuando la ciudad no tiene datos aún
  const proximamente = body.proximamente === true;
  const listaCiudades = ciudades?.length ? ciudades : ciudad ? [ciudad] : [];
  if (!email || listaCiudades.length === 0) {
    return Response.json({ error: "Faltan campos" }, { status: 400 });
  }

  const user = env.LISTMONK_API_USER;
  const pass = env.LISTMONK_API_PASS;
  if (!user || !pass) {
    return Response.json({ error: "Sin configurar" }, { status: 500 });
  }

  const auth = btoa(`${user}:${pass}`);

  const cfAccessHeaders = {};
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    cfAccessHeaders["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
    cfAccessHeaders["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
  }

  const res = await fetch(`${LISTMONK_URL}/api/subscribers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...cfAccessHeaders,
    },
    body: JSON.stringify({
      email,
      name: email,
      status: "enabled",
      lists: [LISTMONK_LIST_ID],
      attribs: { ciudad: listaCiudades[0], ciudades: listaCiudades },
      preconfirm_subscriptions: true,
    }),
  });

  if (!res.ok && res.status !== 409) {
    return Response.json({ error: "Error al suscribir" }, { status: 500 });
  }

  // Si ya existía (409), actualizar sus ciudades (reemplazar, no añadir)
  if (res.status === 409) {
    const existing = await fetch(
      `${LISTMONK_URL}/api/subscribers?query=${encodeURIComponent(`subscribers.email='${email}'`)}&per_page=1`,
      { headers: { Authorization: `Basic ${auth}`, ...cfAccessHeaders } }
    ).then(r => r.json());
    const sub = existing?.data?.results?.[0];
    if (sub) {
      // replace=true → reemplaza ciudades; sin replace → añade (para nuevas suscripciones desde ciudad)
      const replace = body.replace === true;
      const oldCiudades = sub.attribs?.ciudades || (sub.attribs?.ciudad ? [sub.attribs.ciudad] : []);
      const newCiudades = replace ? listaCiudades : [...new Set([...oldCiudades, ...listaCiudades])];
      await fetch(`${LISTMONK_URL}/api/subscribers/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}`, ...cfAccessHeaders },
        body: JSON.stringify({
          email: sub.email, name: sub.name, status: sub.status,
          lists: sub.lists?.map(l => l.id) || [LISTMONK_LIST_ID],
          attribs: { ...sub.attribs, ciudad: newCiudades[0], ciudades: newCiudades },
          preconfirm_subscriptions: true,
        }),
      });
    }
  }

  // Sincronizar con D1 leads_app
  try {
    const emailNorm = email.toLowerCase().trim();
    const existing_d1 = await env.DB.prepare(
      "SELECT email, ciudades, ciudad FROM leads_app WHERE email=?"
    ).bind(emailNorm).first();

    if (existing_d1) {
      let ciudadesActuales = [];
      if (existing_d1.ciudades) {
        try { ciudadesActuales = JSON.parse(existing_d1.ciudades); } catch { ciudadesActuales = []; }
      } else if (existing_d1.ciudad) {
        ciudadesActuales = [existing_d1.ciudad];
      }
      const replace = body.replace === true;
      const newCiudades = replace ? listaCiudades : [...new Set([...ciudadesActuales, ...listaCiudades])];
      await env.DB.prepare(
        "UPDATE leads_app SET ciudades=?, ciudad=? WHERE email=?"
      ).bind(JSON.stringify(newCiudades), newCiudades[0] || null, emailNorm).run();
    } else {
      await env.DB.prepare(
        "INSERT INTO leads_app (email, ciudad, ciudades, created_at) VALUES (?, ?, ?, ?)"
      ).bind(emailNorm, listaCiudades[0] || null, JSON.stringify(listaCiudades), new Date().toISOString()).run();
    }
  } catch { /* silencioso */ }

  // Template 5 = ciudad próximamente | Template 4 = ciudad con datos
  const template_id = proximamente ? 5 : 4;
  await fetch(`${LISTMONK_URL}/api/tx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...cfAccessHeaders,
    },
    body: JSON.stringify({
      subscriber_email: email,
      template_id,
      data: { ciudad: listaCiudades.join(", ") },
    }),
  });

  return Response.json({ ok: true });
}
