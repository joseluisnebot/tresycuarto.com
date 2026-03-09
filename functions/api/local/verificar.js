export async function onRequestGet(context) {
  const { env, request } = context;
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return Response.json({ error: "Token inválido" }, { status: 400 });

  const { results } = await env.DB.prepare(
    "SELECT id FROM usuarios WHERE verify_token = ? AND verified = 0"
  ).bind(token).all();

  if (!results.length) return Response.json({ error: "Token inválido o ya verificado" }, { status: 400 });

  await env.DB.prepare("UPDATE usuarios SET verified = 1, verify_token = NULL WHERE id = ?")
    .bind(results[0].id).run();

  return Response.json({ ok: true });
}
