import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import rutas from "../../../data/rutas.json";

type Parada = {
  numero: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  tiempo_hasta_siguiente: string | null;
};

type Ruta = {
  slug: string;
  titulo: string;
  ciudad: string;
  ciudad_slug: string;
  barrio: string;
  intro: string;
  duracion: string;
  distancia: string;
  mejor_dia: string;
  paradas: Parada[];
  consejos: string[];
  seo_keywords: string[];
};

export async function generateStaticParams() {
  return (rutas as Ruta[]).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ruta = (rutas as Ruta[]).find((r) => r.slug === slug);
  if (!ruta) return {};
  const title = `${ruta.titulo} | tresycuarto`;
  const description = `${ruta.intro.slice(0, 155)}...`;
  return {
    title,
    description,
    openGraph: { title, description, url: `https://tresycuarto.com/rutas/${ruta.slug}` },
    alternates: { canonical: `https://tresycuarto.com/rutas/${ruta.slug}` },
  };
}

export default async function RutaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ruta = (rutas as Ruta[]).find((r) => r.slug === slug);
  if (!ruta) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: ruta.titulo,
    description: ruta.intro,
    numberOfItems: ruta.paradas.length,
    itemListElement: ruta.paradas.map((p) => ({
      "@type": "ListItem",
      position: p.numero,
      name: p.nombre,
      description: p.descripcion,
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "tresycuarto", item: "https://tresycuarto.com" },
      { "@type": "ListItem", position: 2, name: `Tardeo en ${ruta.ciudad}`, item: `https://tresycuarto.com/locales/${ruta.ciudad_slug}` },
      { "@type": "ListItem", position: 3, name: ruta.titulo, item: `https://tresycuarto.com/rutas/${ruta.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <main style={{ background: "#FFF8EF", minHeight: "100vh", fontFamily: "Inter, -apple-system, sans-serif" }}>
        {/* NAV */}
        <nav style={{ background: "white", borderBottom: "1px solid #F5E6D3", padding: "0 1.5rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <Link href="/" style={{ fontWeight: 900, fontSize: "1.1rem", color: "#FB923C", textDecoration: "none", letterSpacing: "-0.03em" }}>
            tres<span style={{ color: "#F59E0B" }}>y</span>cuarto
          </Link>
          <Link href={`/locales/${ruta.ciudad_slug}`} style={{ fontSize: "0.85rem", color: "#78716C", textDecoration: "none" }}>
            ← Locales en {ruta.ciudad}
          </Link>
        </nav>

        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

          {/* BREADCRUMB */}
          <div style={{ fontSize: "0.8rem", color: "#A8A29E", marginBottom: "1.5rem" }}>
            <Link href="/" style={{ color: "#A8A29E", textDecoration: "none" }}>tresycuarto</Link>
            {" › "}
            <Link href={`/locales/${ruta.ciudad_slug}`} style={{ color: "#A8A29E", textDecoration: "none" }}>Tardeo {ruta.ciudad}</Link>
            {" › "}
            <span style={{ color: "#78716C" }}>{ruta.barrio}</span>
          </div>

          {/* HEADER */}
          <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FB923C", background: "#FEF0DC", padding: "0.3rem 0.8rem", borderRadius: "999px", marginBottom: "1rem" }}>
            Ruta de tardeo · {ruta.barrio}
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "0.75rem", color: "#1C1917" }}>
            {ruta.titulo}
          </h1>

          {/* META INFO */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#78716C" }}>⏱ {ruta.duracion}</span>
            <span style={{ fontSize: "0.85rem", color: "#78716C" }}>📍 {ruta.distancia}</span>
            <span style={{ fontSize: "0.85rem", color: "#78716C" }}>📅 {ruta.mejor_dia}</span>
          </div>

          {/* INTRO */}
          <p style={{ fontSize: "1.05rem", color: "#44403C", lineHeight: 1.75, marginBottom: "2.5rem" }}>
            {ruta.intro}
          </p>

          {/* PARADAS */}
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1C1917", marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>
            Las paradas
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {ruta.paradas.map((parada, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem" }}>
                {/* Timeline */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: "#FB923C", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: "0.9rem", flexShrink: 0
                  }}>
                    {parada.numero}
                  </div>
                  {i < ruta.paradas.length - 1 && (
                    <div style={{ width: "2px", flex: 1, minHeight: "2rem", background: "#F5E6D3", margin: "0.25rem 0" }} />
                  )}
                </div>

                {/* Contenido */}
                <div style={{ paddingBottom: i < ruta.paradas.length - 1 ? "1.5rem" : "0", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1C1917", margin: 0 }}>
                      {parada.nombre}
                    </h3>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#A78BFA", background: "#EDE9FE", padding: "0.2rem 0.6rem", borderRadius: "999px", letterSpacing: "0.06em" }}>
                      {parada.tipo}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.95rem", color: "#44403C", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
                    {parada.descripcion}
                  </p>
                  {parada.tiempo_hasta_siguiente && (
                    <div style={{ fontSize: "0.8rem", color: "#A8A29E", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      🚶 {parada.tiempo_hasta_siguiente} hasta la siguiente parada
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CONSEJOS */}
          <div style={{ background: "white", border: "1px solid #F5E6D3", borderRadius: "1.25rem", padding: "1.5rem", marginTop: "2.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1C1917", marginBottom: "1rem" }}>
              💡 Consejos para esta ruta
            </h2>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {ruta.consejos.map((c, i) => (
                <li key={i} style={{ fontSize: "0.95rem", color: "#44403C", lineHeight: 1.6 }}>{c}</li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.95rem", color: "#78716C", marginBottom: "1rem" }}>
              ¿Conoces más locales en {ruta.barrio}?
            </p>
            <Link
              href={`/locales/${ruta.ciudad_slug}`}
              style={{
                display: "inline-block", background: "#FB923C", color: "white",
                padding: "0.75rem 1.75rem", borderRadius: "999px",
                fontWeight: 700, fontSize: "0.95rem", textDecoration: "none"
              }}
            >
              Ver todos los locales en {ruta.ciudad}
            </Link>
          </div>

        </div>

        <footer style={{ textAlign: "center", padding: "2rem 1rem", fontSize: "0.8rem", color: "#A8A29E", borderTop: "1px solid #F5E6D3" }}>
          © 2025 tresycuarto.com — Los mejores locales de tardeo en España
        </footer>
      </main>
    </>
  );
}
