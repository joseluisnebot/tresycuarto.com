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

  const res = await fetch(`${LISTMONK_URL}/api/subscribers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
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

  // 409 = ya existe, lo tratamos como éxito
  if (!res.ok && res.status !== 409) {
    return Response.json({ error: "Error al suscribir" }, { status: 500 });
  }

  // Enviar email de bienvenida solo a suscriptores nuevos
  if (res.status !== 409) {
    await fetch(`${LISTMONK_URL}/api/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        subscriber_email: email,
        template_id: 4,
        data: { ciudad: listaCiudades.join(", ") },
      }),
    });
  }

  return Response.json({ ok: true });
}
