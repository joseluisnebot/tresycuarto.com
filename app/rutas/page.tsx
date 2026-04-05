import type { Metadata } from "next";
import Link from "next/link";
import rutas from "../../data/rutas.json";

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
  paradas: { numero: number; nombre: string; descripcion: string; tipo: string; tiempo_hasta_siguiente: string | null }[];
  consejos?: string[];
  seo_keywords?: string[];
};

export const metadata: Metadata = {
  title: "Rutas de tardeo en España — Barrios y bares | tresycuarto",
  description: "Las mejores rutas de tardeo por barrios de España. Malasaña, La Latina, Gràcia, Ruzafa, Triana y más. Guías paso a paso con paradas, duración y consejos.",
  openGraph: {
    title: "Rutas de tardeo en España — Barrios y bares | tresycuarto",
    description: "Las mejores rutas de tardeo por barrios de España. Malasaña, La Latina, Gràcia, Ruzafa, Triana y más.",
    url: "https://tresycuarto.com/rutas",
  },
  alternates: { canonical: "https://tresycuarto.com/rutas" },
};

// Agrupar por ciudad
const rutasPorCiudad: Record<string, { ciudad_slug: string; rutas: Ruta[] }> = {};
for (const r of rutas as Ruta[]) {
  if (!rutasPorCiudad[r.ciudad]) {
    rutasPorCiudad[r.ciudad] = { ciudad_slug: r.ciudad_slug, rutas: [] };
  }
  rutasPorCiudad[r.ciudad].rutas.push(r);
}

const ciudades = Object.entries(rutasPorCiudad).sort((a, b) =>
  b[1].rutas.length - a[1].rutas.length
);

export default function RutasPage() {
  const totalRutas = (rutas as Ruta[]).length;
  const totalCiudades = ciudades.length;

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* NAV */}
      <nav style={{
        background: "white", borderBottom: "1px solid #F5E6D3",
        padding: "0 1.5rem", height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ fontWeight: 900, fontSize: "1.1rem", color: "#FB923C", textDecoration: "none", letterSpacing: "-0.03em" }}>
          tres<span style={{ color: "#F59E0B" }}>y</span>cuarto
        </Link>
        <Link href="/" style={{ fontSize: "0.85rem", color: "#78716C", textDecoration: "none" }}>
          ← Inicio
        </Link>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

        {/* BREADCRUMB */}
        <div style={{ fontSize: "0.8rem", color: "#A8A29E", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "#A8A29E", textDecoration: "none" }}>tresycuarto</Link>
          {" › "}
          <span style={{ color: "#78716C" }}>Rutas de tardeo</span>
        </div>

        {/* HEADER */}
        <div style={{
          display: "inline-block", fontSize: "0.72rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#FB923C", background: "#FEF0DC",
          padding: "0.3rem 0.8rem", borderRadius: "999px", marginBottom: "1rem",
        }}>
          Guías de barrio
        </div>
        <h1 style={{
          fontSize: "clamp(1.8rem, 5vw, 2.6rem)", fontWeight: 900,
          letterSpacing: "-0.03em", lineHeight: 1.15,
          marginBottom: "0.75rem", color: "#1C1917",
        }}>
          Rutas de tardeo en España
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#44403C", lineHeight: 1.75, marginBottom: "0.5rem" }}>
          {totalRutas} rutas por {totalCiudades} ciudades. Cada ruta recorre los mejores bares de un barrio, con paradas, tiempos de paseo y consejos para sacarle el máximo al tardeo.
        </p>

        {/* CIUDADES CON RUTAS */}
        {ciudades.map(([ciudad, { ciudad_slug, rutas: rutasCiudad }]) => (
          <div key={ciudad} style={{ marginTop: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ fontWeight: 800, color: "#1C1917", fontSize: "1.1rem", margin: 0, letterSpacing: "-0.02em" }}>
                {ciudad}
              </h2>
              <Link
                href={`/locales/${ciudad_slug}`}
                style={{ fontSize: "0.8rem", color: "#FB923C", textDecoration: "none", fontWeight: 600 }}
              >
                Ver locales en {ciudad} →
              </Link>
            </div>

            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {rutasCiudad.map(ruta => (
                <Link
                  key={ruta.slug}
                  href={`/rutas/${ruta.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    background: "white", borderRadius: "1rem",
                    border: "1px solid #F5E6D3", padding: "1.1rem 1.25rem",
                    display: "flex", flexDirection: "column", gap: "0.4rem",
                    transition: "box-shadow 0.15s",
                    cursor: "pointer",
                  }}>
                    <div style={{
                      fontSize: "0.68rem", fontWeight: 700, color: "#A78BFA",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>
                      {ruta.barrio}
                    </div>
                    <div style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.95rem", lineHeight: 1.3 }}>
                      {ruta.titulo}
                    </div>
                    <p style={{
                      fontSize: "0.8rem", color: "#78716C", margin: 0, lineHeight: 1.5,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    } as React.CSSProperties}>
                      {ruta.intro}
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#A8A29E" }}>⏱ {ruta.duracion}</span>
                      <span style={{ fontSize: "0.75rem", color: "#A8A29E" }}>📍 {ruta.distancia}</span>
                      <span style={{ fontSize: "0.75rem", color: "#A8A29E" }}>🗓 {ruta.paradas.length} paradas</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* CTA — más ciudades */}
        <div style={{
          marginTop: "3rem", background: "white", border: "1px solid #F5E6D3",
          borderRadius: "1.25rem", padding: "1.75rem",
          textAlign: "center",
        }}>
          <p style={{ fontWeight: 700, color: "#1C1917", fontSize: "1rem", marginBottom: "0.5rem" }}>
            ¿Tu ciudad no está aquí?
          </p>
          <p style={{ fontSize: "0.9rem", color: "#78716C", marginBottom: "1.25rem" }}>
            Seguimos añadiendo rutas. Mientras tanto, explora los locales de tardeo en más de 60 ciudades.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block", background: "#FB923C", color: "white",
              padding: "0.7rem 1.75rem", borderRadius: "999px",
              fontWeight: 700, fontSize: "0.9rem", textDecoration: "none",
            }}
          >
            Ver todas las ciudades
          </Link>
        </div>

      </div>

      <footer style={{ textAlign: "center", padding: "2rem 1rem", fontSize: "0.8rem", color: "#A8A29E", borderTop: "1px solid #F5E6D3" }}>
        © 2025 tresycuarto.com — Los mejores locales de tardeo en España
      </footer>
    </main>
  );
}
