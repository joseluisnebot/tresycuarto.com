async function getAuthUser(env, request) {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  const now = new Date().toISOString();

  const { results: users } = await env.DB.prepare(
    "SELECT * FROM usuarios WHERE session_token = ? AND session_expires > ?"
  ).bind(token, now).all();
  if (!users.length) return null;
  const user = users[0];

  const localId = request.headers.get("X-Local-Id");
  const { results: uls } = localId
    ? await env.DB.prepare("SELECT * FROM usuario_locales WHERE usuario_id = ? AND local_id = ?").bind(user.id, localId).all()
    : await env.DB.prepare("SELECT * FROM usuario_locales WHERE usuario_id = ? LIMIT 1").bind(user.id).all();
  if (!uls.length) return null;
  const ul = uls[0];

  return {
    id: user.id, ul_id: ul.id, email: user.email,
    local_id: ul.local_id, slug: ul.slug,
    plan: ul.plan || "trial", trial_inicio: ul.trial_inicio, plan_expires: ul.plan_expires,
    stripe_customer_id: ul.stripe_customer_id,
  };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Local-Id",
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers: CORS });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400, headers: CORS }); }

  const { plan } = body; // "monthly" | "annual"
  const priceId = plan === "annual" ? env.STRIPE_PRICE_ANNUAL : env.STRIPE_PRICE_MONTHLY;
  if (!priceId) return Response.json({ error: "Plan no válido" }, { status: 400, headers: CORS });

  const params = new URLSearchParams({
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    mode: "subscription",
    success_url: "https://tresycuarto.com/local/dashboard?pago=ok",
    cancel_url: "https://tresycuarto.com/local/dashboard?pago=cancelado",
    "metadata[user_id]": String(user.id),
    "metadata[ul_id]": String(user.ul_id),
    "metadata[local_id]": user.local_id,
  });

  if (user.stripe_customer_id) {
    params.set("customer", user.stripe_customer_id);
  } else {
    params.set("customer_email", user.email);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Stripe error:", data);
    return Response.json({ error: "Error al crear la sesión de pago" }, { status: 500, headers: CORS });
  }

  return Response.json({ url: data.url }, { headers: CORS });
}
