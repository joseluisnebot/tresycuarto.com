"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type EventoDestacado = {
  slug: string; nombre: string; ciudad: string; ciudad_slug: string;
  fecha_inicio: string; fecha_fin: string; tipo: string;
  descripcion_corta: string; descripcion: string;
  highlights: string[]; consejo_tardeo: string;
  seo_title: string; seo_description: string;
};

type Local = {
  id: string; nombre: string; tipo: string; direccion: string | null;
  horario: string | null; terraza: number; photo_url: string | null;
};

const TIPO_ICON: Record<string, string> = {
  procesion: "⛪", feria: "🎡", concierto: "🎵", festival: "🎪",
  deporte: "⚽", mercado: "🛍️", otro: "📅",
};

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

function formatFecha(f: string) {
  const d = new Date(f + "T12:00:00");
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export default function EventoDetalle({ evento }: { evento: EventoDestacado }) {
  const [locales, setLocales] = useState<Local[]>([]);
  const [loadingLocales, setLoadingLocales] = useState(true);

  useEffect(() => {
    fetch(`/api/locales?ciudad=${encodeURIComponent(evento.ciudad)}&limit=12`)
      .then(r => r.json())
      .then(d => { setLocales(d.locales || []); setLoadingLocales(false); })
      .catch(() => setLoadingLocales(false));
  }, [evento.ciudad]);

  const mismaFecha = evento.fecha_inicio === evento.fecha_fin;

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3", background: "rgba(255,248,239,0.95)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
        <Link href="/eventos" style={{ fontSize: "0.82rem", color: "#78716C", textDecoration: "none" }}>← Eventos</Link>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: "0.75rem", color: "#A8A29E", marginBottom: "1.25rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <Link href="/" style={{ color: "#A8A29E", textDecoration: "none" }}>Inicio</Link>
          <span>›</span>
          <Link href="/eventos" style={{ color: "#A8A29E", textDecoration: "none" }}>Eventos</Link>
          <span>›</span>
          <span style={{ color: "#78716C" }}>{evento.nombre}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "2rem" }}>{TIPO_ICON[evento.tipo] || "📅"}</span>
            <span style={{ fontSize: "0.8rem", background: "#FEF0DC", color: "#FB923C", borderRadius: "999px", padding: "0.3rem 0.9rem", fontWeight: 700 }}>
              {evento.ciudad}
            </span>
            <span style={{ fontSize: "0.8rem", background: "#F5E6D3", color: "#78716C", borderRadius: "999px", padding: "0.3rem 0.9rem", fontWeight: 600 }}>
              {mismaFecha ? formatFecha(evento.fecha_inicio) : `${formatFecha(evento.fecha_inicio)} — ${formatFecha(evento.fecha_fin)}`}
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 900, color: "#1C1917", lineHeight: 1.15, letterSpacing: "-0.03em", margin: "0 0 0.75rem" }}>
            {evento.nombre}
          </h1>
          <p style={{ fontSize: "1.05rem", color: "#78716C", lineHeight: 1.65, margin: 0 }}>
            {evento.descripcion_corta}
          </p>
        </div>

        {/* Descripción */}
        <div style={{ background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", padding: "1.75rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#1C1917", margin: "0 0 0.75rem" }}>Sobre el evento</h2>
          <p style={{ fontSize: "0.92rem", color: "#44403C", lineHeight: 1.75, margin: 0 }}>{evento.descripcion}</p>
        </div>

        {/* Highlights */}
        <div style={{ background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", padding: "1.75rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#1C1917", margin: "0 0 1rem" }}>Lo que no te puedes perder</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {evento.highlights.map((h, i) => (
              <li key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontSize: "0.9rem", color: "#44403C" }}>
                <span style={{ color: "#FB923C", fontWeight: 700, flexShrink: 0 }}>→</span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Consejo tardeo */}
        <div style={{ background: "#FEF0DC", borderRadius: "1.25rem", border: "1px solid #FBD29A", padding: "1.75rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#92400E", margin: "0 0 0.6rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🍻 Dónde tomar algo
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#78350F", lineHeight: 1.7, margin: 0 }}>{evento.consejo_tardeo}</p>
        </div>

        {/* Locales cercanos */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1C1917", margin: 0, letterSpacing: "-0.02em" }}>
              Bares y locales en {evento.ciudad}
            </h2>
            <Link href={`/locales/${evento.ciudad_slug}`} style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FB923C", textDecoration: "none" }}>
              Ver todos en {evento.ciudad} →
            </Link>
          </div>

          {loadingLocales && (
            <p style={{ color: "#A8A29E", fontSize: "0.85rem", padding: "2rem 0", textAlign: "center" }}>Cargando locales...</p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem" }}>
            {locales.map(local => (
              <Link key={local.id} href={`/locales/${local.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "white", borderRadius: "1rem", border: "1px solid #F5E6D3",
                  overflow: "hidden", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#FB923C"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#F5E6D3"}
                >
                  {local.photo_url && (
                    <div style={{ height: "120px", overflow: "hidden", background: "#F5E6D3" }}>
                      <img src={local.photo_url} alt={local.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    </div>
                  )}
                  <div style={{ padding: "0.85rem" }}>
                    <div style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.88rem", marginBottom: "0.2rem" }}>{local.nombre}</div>
                    {local.direccion && (
                      <div style={{ fontSize: "0.72rem", color: "#A8A29E", marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📍 {local.direccion}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                      {local.terraza === 1 && <span style={{ fontSize: "0.68rem", background: "#D1FAE5", color: "#059669", borderRadius: "999px", padding: "0.15rem 0.5rem", fontWeight: 600 }}>☀️ Terraza</span>}
                      {local.horario && <span style={{ fontSize: "0.68rem", background: "#F5E6D3", color: "#78716C", borderRadius: "999px", padding: "0.15rem 0.5rem", fontWeight: 600 }}>🕐 Horario</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
