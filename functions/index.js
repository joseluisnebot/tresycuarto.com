export async function onRequest(context) {
  const { request, env } = context;
  const host = new URL(request.url).hostname;

  // bio subdomain: bar-ankar-valencia.tresycuarto.com → tresycuarto.com/bar-ankar-valencia
  if (host.endsWith(".tresycuarto.com")) {
    const slug = host.slice(0, host.length - ".tresycuarto.com".length);
    const RESERVED = ["www", "listmonk", "api", "cdn", "media"];
    if (slug && !RESERVED.includes(slug)) {
      return Response.redirect(`https://tresycuarto.com/${slug}`, 301);
    }
  }

  return env.ASSETS.fetch(request);
}
