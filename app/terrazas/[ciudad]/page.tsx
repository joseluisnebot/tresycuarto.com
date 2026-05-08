import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import terrazasData from "../../../data/terrazas-por-ciudad.json";

type Local = {
  nombre: string; ciudad: string; slug: string; tipo: string | null;
  direccion: string | null; horario: string | null; rating: number | null;
  photo_url: string | null; descripcion: string | null; ciudad_slug: string;
};
type CiudadData = { nombre: string; slug: string; total: number; locales: Local[] };
const TERRAZAS = terrazasData as Record<string, CiudadData>;

export function generateStaticParams() {
  return Object.keys(TERRAZAS).map(ciudad => ({ ciudad }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ ciudad: string }> }
): Promise<Metadata> {
  const { ciudad } = await params;
  const data = TERRAZAS[ciudad];
  if (!data) return {};
  const title = `Bares con terraza en ${data.nombre} — Las mejores terrazas para tardeo | tresycuarto`;
  const description = `Descubre los ${data.total} mejores bares con terraza en ${data.nombre} para disfrutar del tardeo al aire libre. Horarios, ubicaciones y más.`;
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `https://tresycuarto.com/terrazas/${ciudad}/` },
  };
}

export default async function Page(
  { params }: { params: Promise<{ ciudad: string }> }
) {
  const { ciudad } = await params;
  const data = TERRAZAS[ciudad];
  if (!data) notFound();

  const { nombre, total, locales } = data;

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `Bares con terraza en ${nombre}`,
    "description": `Los mejores bares con terraza para tardeo en ${nombre}`,
    "url": `https://tresycuarto.com/terrazas/${ciudad}/`,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://tresycuarto.com" },
        { "@type": "ListItem", "position": 2, "name": nombre, "item": `https://tresycuarto.com/locales/${ciudad}/` },
        { "@type": "ListItem", "position": 3, "name": `Terrazas en ${nombre}`, "item": `https://tresycuarto.com/terrazas/${ciudad}/` },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>

        {/* Nav */}
        <nav style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3", background: "rgba(255,248,239,0.95)" }}>
          <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.1rem", color: "#1C1917" }}>
            tres<span style={{ color: "#FB923C" }}>y</span>cuarto
          </Link>
        </nav>

        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

          {/* Breadcrumb */}
          <div style={{ fontSize: "0.78rem", color: "#A8A29E", marginBottom: "1.5rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <Link href="/" style={{ color: "#A8A29E", textDecoration: "none" }}>Inicio</Link>
            <span>›</span>
            <Link href={`/locales/${ciudad}/`} style={{ color: "#A8A29E", textDecoration: "none" }}>{nombre}</Link>
            <span>›</span>
            <span style={{ color: "#78716C" }}>Terrazas</span>
          </div>

          {/* Header */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "2rem" }}>☀️</span>
              <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#1C1917", lineHeight: 1.1 }}>
                Bares con terraza en {nombre}
              </h1>
            </div>
            <p style={{ fontSize: "1.05rem", color: "#57534E", lineHeight: 1.65, maxWidth: "680px" }}>
              Los mejores locales con terraza de {nombre} para disfrutar del tardeo al aire libre.
              {total > 10 ? ` ${total} bares con terraza donde pasar la tarde con una copa o un café en buena compañía.` : ""}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <span style={{ background: "#FEF0DC", color: "#FB923C", padding: "0.35rem 0.875rem", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 700 }}>
                ☀️ {total} terrazas
              </span>
              <Link href={`/locales/${ciudad}/`} style={{ background: "white", color: "#78716C", border: "1.5px solid #F5E6D3", padding: "0.35rem 0.875rem", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none" }}>
                Ver todos los locales en {nombre} →
              </Link>
            </div>
          </div>

          {/* Grid de locales */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {locales.map((local) => (
              <Link
                key={`${local.ciudad_slug}/${local.slug}`}
                href={`/locales/${local.ciudad_slug}/${local.slug}`}
                style={{ textDecoration: "none", display: "block", background: "white", borderRadius: "1rem", border: "1.5px solid #F5E6D3", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
              >
                {/* Foto */}
                <div style={{ height: "140px", background: "#FEF0DC", overflow: "hidden", position: "relative" }}>
                  {local.photo_url
                    ? <img src={local.photo_url} alt={local.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>☀️</div>
                  }
                  <span style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "rgba(255,255,255,0.9)", borderRadius: "999px", padding: "0.2rem 0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#FB923C" }}>
                    ☀️ Terraza
                  </span>
                </div>
                {/* Info */}
                <div style={{ padding: "0.875rem 1rem" }}>
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1C1917", margin: "0 0 0.25rem", lineHeight: 1.3 }}>{local.nombre}</h2>
                  <p style={{ fontSize: "0.78rem", color: "#78716C", margin: 0 }}>
                    {local.tipo || "Bar"}{local.direccion ? ` · ${local.direccion}` : ""}
                  </p>
                  {local.horario && (
                    <p style={{ fontSize: "0.75rem", color: "#A8A29E", marginTop: "0.3rem" }}>🕒 {local.horario}</p>
                  )}
                  {local.rating && (
                    <p style={{ fontSize: "0.78rem", color: "#F59E0B", marginTop: "0.3rem", fontWeight: 700 }}>★ {local.rating}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Footer SEO */}
          <div style={{ marginTop: "3rem", padding: "1.5rem", background: "white", borderRadius: "1rem", border: "1.5px solid #F5E6D3" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1C1917", marginBottom: "0.5rem" }}>
              Terrazas para tardeo en {nombre}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#57534E", lineHeight: 1.65 }}>
              El tardeo en terraza es uno de los grandes placeres de {nombre}. Desde primavera hasta otoño,
              estos locales abren sus terrazas para que disfrutes de una tarde con amigos, en pareja o en familia.
              Encuentra tu terraza favorita y descubre el ambiente único del tardeo en {nombre}.
            </p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link href={`/locales/${ciudad}/`} style={{ fontSize: "0.82rem", color: "#FB923C", fontWeight: 700, textDecoration: "none" }}>
                → Todos los locales en {nombre}
              </Link>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
