"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import cities from "../../../data/cities.json";

type CityEntry = { slug: string; nombre: string };
type Evento = {
  id: string;
  nombre: string;
  tipo: string;
  ciudad: string;
  fecha: string;
  hora_inicio: string | null;
  direccion: string | null;
  descripcion: string | null;
  lat: number | null;
  lon: number | null;
};

const SLUG_A_CIUDAD = Object.fromEntries(
  (cities as CityEntry[]).map(c => [c.slug, c.nombre])
);

const TIPO_ICON: Record<string, string> = {
  procesion: "⛪", feria: "🎡", concierto: "🎵", festival: "🎪",
  deporte: "⚽", teatro: "🎭", mercado: "🛍️", exposicion: "🖼️",
  gastronomia: "🍽️", musica: "🎵", evento: "📅", cultura: "🎨",
};

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  procesion:   { bg: "#EDE9FE", color: "#7C3AED" },
  feria:       { bg: "#FEF0DC", color: "#FB923C" },
  concierto:   { bg: "#FCE7F3", color: "#E1306C" },
  festival:    { bg: "#FEF3C7", color: "#F59E0B" },
  deporte:     { bg: "#D1FAE5", color: "#059669" },
  teatro:      { bg: "#E0F2FE", color: "#0369A1" },
  mercado:     { bg: "#FEF0DC", color: "#FB923C" },
  exposicion:  { bg: "#F5F3FF", color: "#7C3AED" },
  gastronomia: { bg: "#D1FAE5", color: "#059669" },
  musica:      { bg: "#FCE7F3", color: "#E1306C" },
  cultura:     { bg: "#E0F2FE", color: "#0369A1" },
  evento:      { bg: "#F5F3FF", color: "#78716C" },
};

function formatFecha(fecha: string, hora?: string | null): string {
  const d = new Date(fecha + "T12:00:00");
  const hoy = new Date();
  const manana = new Date(); manana.setDate(hoy.getDate() + 1);
  const esHoy = d.toDateString() === hoy.toDateString();
  const esManana = d.toDateString() === manana.toDateString();

  const fechaStr = esHoy ? "Hoy" : esManana ? "Mañana" : d.toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });
  return hora ? `${fechaStr} · ${hora}` : fechaStr;
}

function agruparPorFecha(eventos: Evento[]): { fecha: string; eventos: Evento[] }[] {
  const grupos: Record<string, Evento[]> = {};
  for (const ev of eventos) {
    if (!grupos[ev.fecha]) grupos[ev.fecha] = [];
    grupos[ev.fecha].push(ev);
  }
  return Object.entries(grupos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, eventos]) => ({ fecha, eventos }));
}

export default function AgendaPage({ slug }: { slug: string }) {
  const nombre = SLUG_A_CIUDAD[slug] || slug;
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("todos");

  useEffect(() => {
    fetch(`/api/app/eventos?ciudad=${slug}`)
      .then(r => r.json())
      .then(d => { setEventos(d.eventos || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const tipos = ["todos", ...Array.from(new Set(eventos.map(e => e.tipo))).sort()];
  const eventosFiltrados = filtro === "todos" ? eventos : eventos.filter(e => e.tipo === filtro);
  const grupos = agruparPorFecha(eventosFiltrados);

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3",
        background: "rgba(255,248,239,0.95)", position: "sticky", top: 0,
        backdropFilter: "blur(8px)", zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 900, fontSize: "1.1rem", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
        <Link href={`/locales/${slug}`} style={{ fontSize: "0.85rem", color: "#78716C", textDecoration: "none", fontWeight: 600 }}>
          ← Locales en {nombre}
        </Link>
      </nav>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FB923C", background: "#FEF0DC", padding: "0.3rem 0.8rem", borderRadius: "999px", display: "inline-block", marginBottom: "0.75rem" }}>
            Agenda
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem,5vw,2.5rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "#1C1917", margin: "0 0 0.4rem" }}>
            Qué hacer en {nombre}
          </h1>
          <p style={{ color: "#78716C", fontSize: "0.95rem", margin: 0 }}>
            Eventos, conciertos y planes próximos · Actualizado cada día
          </p>
        </div>

        {/* Filtros por tipo */}
        {tipos.length > 2 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {tipos.map(t => {
              const activo = filtro === t;
              const col = TIPO_COLOR[t] || TIPO_COLOR["evento"];
              return (
                <button key={t} onClick={() => setFiltro(t)} style={{
                  padding: "0.35rem 0.9rem", borderRadius: "999px", border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: "0.8rem",
                  background: activo ? col.bg : "white",
                  color: activo ? col.color : "#78716C",
                  boxShadow: activo ? `0 0 0 1.5px ${col.color}` : "0 0 0 1px #F5E6D3",
                }}>
                  {TIPO_ICON[t] || "📅"} {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </div>
        )}

        {/* Contenido */}
        {loading && (
          <p style={{ color: "#A8A29E", textAlign: "center", padding: "3rem 0" }}>Cargando agenda...</p>
        )}

        {!loading && grupos.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📅</div>
            <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.5rem" }}>Sin eventos próximos en {nombre}</p>
            <p style={{ color: "#78716C", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              De momento no tenemos eventos programados para esta ciudad. ¡Vuelve pronto!
            </p>
            <Link href={`/locales/${slug}`} style={{ color: "#FB923C", fontWeight: 700, textDecoration: "none" }}>
              Ver locales de tardeo →
            </Link>
          </div>
        )}

        {grupos.map(({ fecha, eventos: evs }) => {
          const d = new Date(fecha + "T12:00:00");
          const hoy = new Date();
          const manana = new Date(); manana.setDate(hoy.getDate() + 1);
          const esHoy = d.toDateString() === hoy.toDateString();
          const esManana = d.toDateString() === manana.toDateString();
          const labelFecha = esHoy ? "Hoy" : esManana ? "Mañana" : d.toLocaleDateString("es-ES", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          });

          return (
            <div key={fecha} style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <span style={{
                  fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                  color: esHoy ? "#FB923C" : "#78716C",
                }}>
                  {labelFecha}
                </span>
                <div style={{ flex: 1, height: "1px", background: "#F5E6D3" }} />
                <span style={{ fontSize: "0.72rem", color: "#A8A29E" }}>{evs.length} evento{evs.length !== 1 ? "s" : ""}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {evs.map(ev => {
                  const col = TIPO_COLOR[ev.tipo] || TIPO_COLOR["evento"];
                  const icon = TIPO_ICON[ev.tipo] || "📅";
                  return (
                    <div key={ev.id} style={{
                      background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3",
                      padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                        <h2 style={{ fontWeight: 800, color: "#1C1917", fontSize: "1rem", margin: 0, lineHeight: 1.3 }}>
                          {icon} {ev.nombre}
                        </h2>
                        <span style={{ flexShrink: 0, fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px", background: col.bg, color: col.color }}>
                          {ev.tipo}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.8rem", color: "#78716C" }}>
                        <span>🕐 {formatFecha(ev.fecha, ev.hora_inicio)}</span>
                        {ev.direccion && <span>📍 {ev.direccion}</span>}
                      </div>

                      {ev.descripcion && (
                        <p style={{ fontSize: "0.85rem", color: "#57534E", margin: 0, lineHeight: 1.6 }}>
                          {ev.descripcion}
                        </p>
                      )}

                      {ev.lat && ev.lon && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${ev.lat},${ev.lon}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", fontWeight: 600, color: "#FB923C", textDecoration: "none", marginTop: "0.25rem", width: "fit-content" }}
                        >
                          🗺️ Cómo llegar
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* CTA locales */}
        {!loading && grupos.length > 0 && (
          <div style={{ marginTop: "2rem", padding: "1.5rem", background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", textAlign: "center" }}>
            <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.5rem" }}>¿Y dónde tomar algo antes?</p>
            <p style={{ color: "#78716C", fontSize: "0.875rem", marginBottom: "1rem" }}>Descubre los mejores bares y terrazas de {nombre} para el tardeo.</p>
            <Link href={`/locales/${slug}`} style={{
              display: "inline-block", padding: "0.75rem 1.75rem",
              background: "linear-gradient(135deg,#FB923C,#F59E0B)",
              color: "white", fontWeight: 700, textDecoration: "none", borderRadius: "0.75rem",
            }}>
              Ver locales en {nombre} →
            </Link>
          </div>
        )}
      </div>

      <footer style={{ textAlign: "center", padding: "2rem 1rem", fontSize: "0.8rem", color: "#A8A29E", borderTop: "1px solid #F5E6D3", marginTop: "2rem" }}>
        © 2025 tresycuarto.com — Los mejores planes de tardeo en España
      </footer>
    </main>
  );
}
