"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import cities from "../../../data/cities.json";
import ciudadContentData from "../../../data/ciudad-content.json";

// tipo === null significa "todos los tipos"
const TIPO_SLUG: Record<string, string | null> = {
  bares: "bar",
  pubs: "pub",
  cafeterias: "cafe",
  terrazas: "biergarten",
  "tardeo": null,
  "planes-tarde": null,
  "terraza-tarde": "biergarten",
};

const TIPO_LABEL: Record<string, string> = {
  bar: "Bar",
  pub: "Pub",
  cafe: "Cafetería",
  biergarten: "Terraza",
};

const TIPO_PLURAL: Record<string, string> = {
  bar: "Bares",
  pub: "Pubs",
  cafe: "Cafeterías",
  biergarten: "Terrazas",
};

// Título H1 para slugs sin tipo fijo
const SLUG_H1: Record<string, (ciudad: string) => string> = {
  "tardeo": (c) => `Tardeo en ${c}`,
  "planes-tarde": (c) => `Planes de tarde en ${c}`,
  "terraza-tarde": (c) => `Terrazas para el tardeo en ${c}`,
};

const TIPO_INTRO: Record<string, (ciudad: string) => string> = {
  bar: (c) => `Encuentra los mejores bares de ${c} para el tardeo. Desde el vermut del mediodía hasta la primera copa de la noche, estos son los bares más auténticos donde tomar algo en ${c} por la tarde.`,
  pub: (c) => `Los mejores pubs de ${c} para el tardeo. Ambiente, buena música y copas a media tarde — esta es la selección de pubs imprescindibles para el tardeo en ${c}.`,
  cafe: (c) => `Las mejores cafeterías de ${c} para un tardeo tranquilo. Si prefieres un café con leche o una tapa a media tarde antes de la noche, estas son las cafeterías más recomendadas de ${c}.`,
  biergarten: (c) => `Las mejores terrazas de ${c} para disfrutar el tardeo al aire libre. Sol, buena compañía y una copa en la mano — descubre las terrazas con más ambiente de ${c} para la tarde.`,
  "tardeo": (c) => `Descubre los mejores locales de tardeo en ${c}: bares, pubs, cafeterías y terrazas donde disfrutar de la tarde. tresycuarto tiene mapeados todos los rincones de ${c} para que encuentres el plan perfecto a media tarde.`,
  "planes-tarde": (c) => `¿Qué hacer por la tarde en ${c}? Desde el vermut hasta el primer cóctel de la noche, estos son los mejores planes de tarde en ${c}: terrazas con vistas, bares con buena tapa y cafeterías con encanto. Guía completa de ocio de tarde en ${c}.`,
  "terraza-tarde": (c) => `Las mejores terrazas de ${c} para el tardeo al aire libre. Tanto si buscas una terraza para el vermut como para alargar la tarde con amigos, aquí tienes la selección más completa de terrazas y bares con terraza en ${c}.`,
};

const SLUG_A_CIUDAD = Object.fromEntries(
  (cities as { slug: string; nombre: string }[]).map(c => [c.slug, c.nombre])
);

const CIUDAD_CONTENT = ciudadContentData as Record<string, { coords?: { lat: number; lon: number } }>;

const OTROS_TIPOS: Record<string, { slug: string; label: string }[]> = {
  bares: [
    { slug: "pubs", label: "Pubs" },
    { slug: "cafeterias", label: "Cafeterías" },
    { slug: "terrazas", label: "Terrazas" },
  ],
  pubs: [
    { slug: "bares", label: "Bares" },
    { slug: "cafeterias", label: "Cafeterías" },
    { slug: "terrazas", label: "Terrazas" },
  ],
  cafeterias: [
    { slug: "bares", label: "Bares" },
    { slug: "pubs", label: "Pubs" },
    { slug: "terrazas", label: "Terrazas" },
  ],
  terrazas: [
    { slug: "bares", label: "Bares" },
    { slug: "pubs", label: "Pubs" },
    { slug: "cafeterias", label: "Cafeterías" },
  ],
};

function ciudadSlug(ciudad: string): string {
  return ciudad.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Ciudades cercanas usando haversine
function ciudadesCercanas(ciudadSlugActual: string, n = 4): { nombre: string; slug: string }[] {
  const ciudad = (cities as { slug: string; nombre: string }[]).find(c => c.slug === ciudadSlugActual);
  if (!ciudad) return [];
  const coords = CIUDAD_CONTENT[ciudad.nombre]?.coords;
  if (!coords) return (cities as { slug: string; nombre: string }[]).filter(c => c.slug !== ciudadSlugActual).slice(0, n);
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dist = (lat2: number, lon2: number) => {
    const dLat = toRad(lat2 - coords.lat);
    const dLon = toRad(lon2 - coords.lon);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(coords.lat)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  return (cities as { slug: string; nombre: string }[])
    .filter(c => c.slug !== ciudadSlugActual && CIUDAD_CONTENT[c.nombre]?.coords)
    .map(c => ({ ...c, d: dist(CIUDAD_CONTENT[c.nombre]!.coords!.lat, CIUDAD_CONTENT[c.nombre]!.coords!.lon) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map(c => ({ nombre: c.nombre, slug: c.slug }));
}

type Local = {
  id: string; nombre: string; tipo: string; ciudad: string;
  direccion: string; horario: string | null; terraza: number;
  rating: number | null; rating_count: number | null;
};

const LIMIT = 24;

export default function TipoEnCiudadPage({ tipoSlug, ciudadSlug: ciudadSlugProp }: { tipoSlug: string; ciudadSlug: string }) {
  const tipo = TIPO_SLUG[tipoSlug] ?? "bar"; // null = todos los tipos
  const nombreCiudad = SLUG_A_CIUDAD[ciudadSlugProp] || ciudadSlugProp;
  const tipoPlural = tipo ? (TIPO_PLURAL[tipo] || "Locales") : "Locales";

  const [locales, setLocales] = useState<Local[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [cercanas, setCercanas] = useState<{ nombre: string; slug: string }[]>([]);

  useEffect(() => {
    setCercanas(ciudadesCercanas(ciudadSlugProp, 4));
  }, [ciudadSlugProp]);

  useEffect(() => {
    setLoading(true);
    let url = `/api/locales?ciudad=${encodeURIComponent(nombreCiudad)}&limit=${LIMIT}&offset=${offset}`;
    if (tipo) url += `&tipo=${tipo}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setLocales(d.locales || []); setTotal(d.total || 0); })
      .catch(() => setLocales([]))
      .finally(() => setLoading(false));
  }, [nombreCiudad, tipo, offset]);

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3",
        background: "rgba(255,248,239,0.95)", position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(8px)",
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
        <Link href={`/locales/${ciudadSlugProp}`} style={{ fontSize: "0.82rem", color: "#78716C", textDecoration: "none", fontWeight: 600 }}>
          ← Todos los locales en {nombreCiudad}
        </Link>
      </nav>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg,#FFF8EF 0%,#FEF0DC 100%)",
        padding: "2.5rem 1.5rem 1.5rem", textAlign: "center",
      }}>
        <span style={{
          background: "#FEF0DC", color: "#FB923C", borderRadius: "999px",
          padding: "0.3rem 0.9rem", fontSize: "0.78rem", fontWeight: 700,
        }}>Tardeo en {nombreCiudad}</span>
        <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.75rem)", fontWeight: 900, color: "#1C1917", margin: "0.75rem 0 0.5rem", lineHeight: 1.15 }}>
          {SLUG_H1[tipoSlug] ? SLUG_H1[tipoSlug](nombreCiudad) : <>{tipoPlural} para el tardeo<br />en {nombreCiudad}</>}
        </h1>
        {!loading && total > 0 && (
          <p style={{ color: "#78716C", fontSize: "1rem", margin: 0 }}>
            {total.toLocaleString("es-ES")} {tipo ? tipoPlural.toLowerCase() : "locales"} mapeados
          </p>
        )}
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem" }}>

        {/* Intro SEO */}
        <p style={{
          background: "white", borderRadius: "1rem", border: "1px solid #F5E6D3",
          padding: "1.25rem 1.5rem", color: "#57534E", fontSize: "0.95rem",
          lineHeight: 1.7, marginBottom: "1.5rem",
        }}>
          {(TIPO_INTRO[tipoSlug] || TIPO_INTRO[tipo || ""])?.(nombreCiudad)}
        </p>

        {/* Filtros rápidos — otros tipos en esta ciudad */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <Link href={`/locales/${ciudadSlugProp}`} style={{
            padding: "0.4rem 1rem", borderRadius: "999px", border: "1.5px solid #F5E6D3",
            background: "white", color: "#78716C", fontWeight: 600, fontSize: "0.82rem",
            textDecoration: "none",
          }}>Todos</Link>
          <span style={{
            padding: "0.4rem 1rem", borderRadius: "999px", border: "1.5px solid #FB923C",
            background: "#FEF0DC", color: "#FB923C", fontWeight: 700, fontSize: "0.82rem",
          }}>{tipoPlural}</span>
          {(OTROS_TIPOS[tipoSlug] || []).map(o => (
            <Link key={o.slug} href={`/tardeo/${o.slug}-en-${ciudadSlugProp}`} style={{
              padding: "0.4rem 1rem", borderRadius: "999px", border: "1.5px solid #F5E6D3",
              background: "white", color: "#78716C", fontWeight: 600, fontSize: "0.82rem",
              textDecoration: "none",
            }}>{o.label}</Link>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: "#A8A29E" }}>
            Cargando {tipoPlural.toLowerCase()}...
          </div>
        )}

        {!loading && locales.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#78716C" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔍</div>
            <p style={{ fontWeight: 600 }}>No encontramos {tipoPlural.toLowerCase()} en {nombreCiudad} aún.</p>
            <Link href={`/locales/${ciudadSlugProp}`} style={{
              display: "inline-block", marginTop: "1rem", padding: "0.5rem 1.2rem",
              borderRadius: "999px", background: "#FB923C", color: "white",
              fontWeight: 700, fontSize: "0.85rem", textDecoration: "none",
            }}>Ver todos los locales →</Link>
          </div>
        )}

        {/* Grid */}
        {!loading && locales.length > 0 && (
          <>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))" }}>
              {locales.map(local => (
                <a key={local.id} href={`/locales/${local.id}`} style={{
                  textDecoration: "none", color: "inherit",
                  background: "white", borderRadius: "1.25rem",
                  border: "1px solid #F5E6D3", padding: "1.25rem",
                  display: "flex", flexDirection: "column", gap: "0.4rem",
                  transition: "box-shadow 0.15s, transform 0.15s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; (e.currentTarget as HTMLElement).style.transform = ""; }}
                >
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                      color: "#FB923C", background: "#FEF0DC", padding: "0.25rem 0.6rem", borderRadius: "999px",
                    }}>
                      {TIPO_LABEL[local.tipo] || "Local"}
                    </span>
                    {local.terraza === 1 && (
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700, color: "#059669",
                        background: "#D1FAE5", padding: "0.25rem 0.6rem", borderRadius: "999px",
                      }}>☀️ Terraza</span>
                    )}
                  </div>
                  <h2 style={{ fontWeight: 700, color: "#1C1917", fontSize: "1rem", margin: 0, lineHeight: 1.3 }}>
                    {local.nombre}
                  </h2>
                  {local.rating && local.rating > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "#F59E0B", fontSize: "0.82rem" }}>{"★".repeat(Math.round(local.rating))}{"☆".repeat(5 - Math.round(local.rating))}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1C1917" }}>{local.rating.toFixed(1)}</span>
                      {local.rating_count && <span style={{ fontSize: "0.75rem", color: "#A8A29E" }}>({local.rating_count.toLocaleString("es-ES")})</span>}
                    </div>
                  )}
                  {local.direccion && (
                    <p style={{ fontSize: "0.8rem", color: "#78716C", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📍 {local.direccion}
                    </p>
                  )}
                  {local.horario && (
                    <p style={{ fontSize: "0.8rem", color: "#78716C", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      🕒 {local.horario}
                    </p>
                  )}
                </a>
              ))}
            </div>

            {/* Paginación */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginTop: "2rem" }}>
              {offset > 0 && (
                <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} style={{
                  padding: "0.6rem 1.5rem", borderRadius: "0.75rem", border: "1.5px solid #F5E6D3",
                  background: "white", color: "#78716C", fontWeight: 600, cursor: "pointer",
                }}>← Anterior</button>
              )}
              <span style={{ color: "#78716C", fontSize: "0.875rem" }}>
                Página {Math.floor(offset / LIMIT) + 1} de {Math.ceil(total / LIMIT)}
              </span>
              {offset + LIMIT < total && (
                <button onClick={() => setOffset(offset + LIMIT)} style={{
                  padding: "0.6rem 1.5rem", borderRadius: "0.75rem", border: "none",
                  background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white",
                  fontWeight: 700, cursor: "pointer",
                }}>Siguiente →</button>
              )}
            </div>
          </>
        )}

        {/* Internal links — otros tipos + ciudades cercanas */}
        <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid #F5E6D3" }}>
          <h2 style={{ fontWeight: 800, fontSize: "0.9rem", color: "#78716C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
            Más tardeo en {nombreCiudad}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {(OTROS_TIPOS[tipoSlug] || []).map(o => (
              <Link key={o.slug} href={`/tardeo/${o.slug}-en-${ciudadSlugProp}`} style={{
                padding: "0.5rem 1rem", borderRadius: "999px", border: "1.5px solid #F5E6D3",
                background: "white", color: "#FB923C", fontWeight: 700, fontSize: "0.85rem",
                textDecoration: "none",
              }}>{o.label} en {nombreCiudad} →</Link>
            ))}
            <Link href={`/locales/${ciudadSlugProp}`} style={{
              padding: "0.5rem 1rem", borderRadius: "999px", border: "1.5px solid #1C1917",
              background: "#1C1917", color: "white", fontWeight: 700, fontSize: "0.85rem",
              textDecoration: "none",
            }}>Todos los locales en {nombreCiudad} →</Link>
          </div>

          {cercanas.length > 0 && (
            <>
              <h2 style={{ fontWeight: 800, fontSize: "0.9rem", color: "#78716C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                {tipoPlural} en ciudades cercanas
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {cercanas.map(c => (
                  <Link key={c.slug} href={`/tardeo/${tipoSlug}-en-${c.slug}`} style={{
                    padding: "0.5rem 1rem", borderRadius: "999px", border: "1.5px solid #F5E6D3",
                    background: "white", color: "#78716C", fontWeight: 600, fontSize: "0.85rem",
                    textDecoration: "none",
                  }}>{tipoPlural} en {c.nombre} →</Link>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      <footer style={{ borderTop: "1px solid #F5E6D3", padding: "2rem 1.5rem", textAlign: "center", marginTop: "4rem" }}>
        <p style={{ fontSize: "0.8rem", color: "#A8A29E" }}>
          <Link href="/" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 700 }}>tresycuarto.com</Link>
          {" · "}El tardeo en España{" · "}
          <Link href={`/locales/${ciudadSlugProp}`} style={{ color: "#A8A29E", textDecoration: "none" }}>
            Tardeo en {nombreCiudad}
          </Link>
        </p>
      </footer>
    </main>
  );
}
