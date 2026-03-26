export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const ciudad = url.searchParams.get("ciudad");

  // Redirigir URLs antiguas (?ciudad=X) a URLs limpias (/locales/madrid)
  if (ciudad) {
    const slug = ciudad.toLowerCase()
      .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i").replace(/ó/g,"o").replace(/ú/g,"u")
      .replace(/ü/g,"u").replace(/ñ/g,"n")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    return Response.redirect(`https://tresycuarto.com/locales/${slug}`, 301);
  }

  // Sin parámetro: redirigir a Madrid por defecto
  return Response.redirect("https://tresycuarto.com/locales/madrid", 302);
}
