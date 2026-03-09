const ZONE_ID = "5cde45781dcb65b4336b5c8626603520";

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
    id: user.id, ul_id: ul.id,
    local_id: ul.local_id, slug: ul.slug,
    plan: ul.plan || "trial", trial_inicio: ul.trial_inicio, plan_expires: ul.plan_expires,
  };
}

function isPlanActive(user) {
  if (user.plan === "pro") {
    if (!user.plan_expires) return true;
    return new Date(user.plan_expires) > new Date();
  }
  if (!user.trial_inicio) return false;
  const trialEnd = new Date(new Date(user.trial_inicio).getTime() + 14 * 24 * 60 * 60 * 1000);
  return trialEnd > new Date();
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getAuthUser(env, request);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!isPlanActive(user)) return Response.json({ error: "Las estadísticas requieren el plan Pro" }, { status: 403 });

  const slug = user.slug;
  const bioUrl = `/l/${slug}`;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let visitas = [];
  let totalVisitas = 0;
  let visitasHoy = 0;

  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          viewer {
            zones(filter: { zoneTag: "${ZONE_ID}" }) {
              httpRequests1dGroups(
                limit: 30,
                orderBy: [date_ASC],
                filter: { date_gt: "${since}", clientRequestPath: "${bioUrl}" }
              ) {
                dimensions { date }
                sum { pageViews }
                uniq { uniques }
              }
            }
          }
        }`,
      }),
    });
    const data = await res.json();
    visitas = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
    totalVisitas = visitas.reduce((s, v) => s + v.uniq.uniques, 0);
    const hoy = new Date().toISOString().slice(0, 10);
    visitasHoy = visitas.find(v => v.dimensions.date === hoy)?.uniq?.uniques || 0;
  } catch { /* silencioso si falla analytics */ }

  return Response.json({ visitas, totalVisitas, visitasHoy, periodo: "30 días" });
}
