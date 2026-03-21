"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import citiesData from "../../data/cities.json";

type Evento = {
  id: string; nombre: string; tipo: string; ciudad: string;
  fecha: string; hora_inicio?: string; direccion?: string; descripcion: string;
  radio_m?: number;
};

type Local = {
  id: string; nombre: string; tipo: string; direccion: string | null;
  horario: string | null; terraza: number; web: string | null;
  instagram: string | null; distancia_m: number;
};

const TIPO_ICON: Record<string, string> = {
  procesion: "⛪", feria: "🎡", concierto: "🎵", música: "🎵",
  festival: "🎪", deporte: "⚽", escena: "🎭", mercado: "🛍️",
  exposicion: "🖼️", evento: "📅", otro: "📅",
};

const TIPO_LABEL: Record<string, string> = {
  bar: "Bar", pub: "Pub", cafe: "Cafetería", biergarten: "Terraza",
};

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fechaLarga(f: string) {
  const d = new Date(f + "T12:00:00");
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function ciudadSlug(nombre: string) {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function LocalesPanel({ eventoId, radio }: { eventoId: string; radio?: number }) {
  const [locales, setLocales] = useState<Local[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/eventos/${eventoId}/locales`)
      .then(r => r.json())
      .then(d => { setLocales(d.locales || []); setLoading(false); })
      .catch(() => { setLocales([]); setLoading(false); });
  }, [eventoId]);

  if (loading) return (
    <div style={{ padding: "1rem 0", color: "#A8A29E", fontSize: "0.85rem", textAlign: "center" }}>
      Cargando locales...
    </div>
  );

  if (!locales || locales.length === 0) return (
    <div style={{ padding: "0.75rem 0", color: "#A8A29E", fontSize: "0.82rem" }}>
      Sin locales mapeados en este radio aún.
    </div>
  );

  const sinUbicacion = locales.some(l => (l.distancia_m ?? -1) < 0);

  return (
    <div style={{ marginTop: "0.75rem", borderTop: "1px solid #F5E6D3", paddingTop: "0.75rem" }}>
      <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: sinUbicacion ? "#F59E0B" : "#A8A29E", fontWeight: 600 }}>
        {sinUbicacion
          ? `⚠ Sin ubicación concreta — selección de la ciudad`
          : `${locales.length} locales a ≤${radio ?? "?"}m del evento`}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {locales.map((l, i) => (
          <a key={l.id} href={`/locales/${l.id}`} style={{
            textDecoration: "none", display: "flex", gap: "0.75rem", alignItems: "center",
            background: i === 0 ? "#FFF8EF" : "transparent",
            borderRadius: "0.6rem", padding: "0.5rem 0.6rem",
            border: i === 0 ? "1px solid #F5E6D3" : "none",
          }}>
            <span style={{
              fontSize: "0.68rem", fontWeight: 700, color: "#FB923C",
              background: "#FEF0DC", borderRadius: "999px", padding: "0.2rem 0.5rem",
              whiteSpace: "nowrap", minWidth: "40px", textAlign: "center",
            }}>
              {(l.distancia_m ?? -1) >= 0 ? `${l.distancia_m}m` : "ciudad"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.88rem" }}>{l.nombre}</span>
              {l.terraza === 1 && <span style={{ marginLeft: "0.4rem", fontSize: "0.7rem", color: "#059669" }}>☀️</span>}
              {l.direccion && (
                <div style={{ fontSize: "0.75rem", color: "#A8A29E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  📍 {l.direccion}
                </div>
              )}
            </div>
            <span style={{ fontSize: "0.75rem", color: "#FB923C", fontWeight: 600, whiteSpace: "nowrap" }}>→</span>
          </a>
        ))}
      </div>
      <a href={`/locales/${ciudadSlug(locales[0]?.id?.split("_")[0] ?? "")}`} style={{ display: "none" }} />
    </div>
  );
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [ciudad, setCiudad] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const ciudades = (citiesData as { nombre: string }[]).map(c => c.nombre);

  useEffect(() => {
    setLoading(true);
    const url = ciudad ? `/api/eventos?limit=50&ciudad=${encodeURIComponent(ciudad)}` : "/api/eventos?limit=50";
    fetch(url).then(r => r.json()).then(d => { setEventos(d.eventos || []); setLoading(false); });
  }, [ciudad]);

  // Agrupar por mes
  const porMes: Record<string, Evento[]> = {};
  for (const ev of eventos) {
    const d = new Date(ev.fecha + "T12:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!porMes[key]) porMes[key] = [];
    porMes[key].push(ev);
  }

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3", background: "rgba(255,248,239,0.95)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
        <Link href="/" style={{ fontSize: "0.82rem", color: "#78716C", textDecoration: "none" }}>← Volver</Link>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Cabecera */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#1C1917", margin: "0 0 0.5rem" }}>
            Eventos y tardeo
          </h1>
          <p style={{ color: "#78716C", margin: 0, fontSize: "1rem" }}>
            Procesiones, ferias, conciertos y más — los mejores momentos para salir
          </p>
        </div>

        {/* Filtro ciudad */}
        <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => setCiudad("")} style={{
            padding: "0.4rem 1rem", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
            background: !ciudad ? "#1C1917" : "#F5E6D3", color: !ciudad ? "white" : "#78716C",
          }}>Todas las ciudades</button>
          {["Sevilla","Madrid","Málaga","Valencia","Barcelona","Córdoba","Granada","Cádiz","Jerez de la Frontera","Valladolid","Salamanca","Murcia"].filter(c => ciudades.includes(c)).map(c => (
            <button key={c} onClick={() => setCiudad(c === ciudad ? "" : c)} style={{
              padding: "0.4rem 1rem", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
              background: ciudad === c ? "#FB923C" : "#F5E6D3", color: ciudad === c ? "white" : "#78716C",
            }}>{c}</button>
          ))}
        </div>

        {loading && <p style={{ color: "#A8A29E", textAlign: "center", padding: "3rem 0" }}>Cargando eventos...</p>}

        {!loading && eventos.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "#A8A29E" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📅</div>
            <p>No hay eventos próximos{ciudad ? ` en ${ciudad}` : ""}.</p>
          </div>
        )}

        {/* Eventos agrupados por mes */}
        {Object.entries(porMes).map(([key, evs]) => {
          const [year, mes] = key.split("-").map(Number);
          const mesNombre = MESES[mes];
          return (
            <div key={key} style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "0.78rem", fontWeight: 700, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                {mesNombre} {year}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {evs.map(ev => {
                  const abierto = expandido === ev.id;
                  return (
                    <div key={ev.id}
                      onClick={() => setExpandido(abierto ? null : ev.id)}
                      style={{
                        background: "white", borderRadius: "1rem",
                        border: `1px solid ${abierto ? "#FB923C" : "#F5E6D3"}`,
                        padding: "1rem 1.25rem", cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => { if (!abierto) (e.currentTarget as HTMLElement).style.borderColor = "#FDBA74"; }}
                      onMouseLeave={e => { if (!abierto) (e.currentTarget as HTMLElement).style.borderColor = "#F5E6D3"; }}
                    >
                      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                        {/* Icono + fecha */}
                        <div style={{ minWidth: "48px", textAlign: "center", paddingTop: "0.1rem" }}>
                          <div style={{ fontSize: "1.4rem", lineHeight: 1 }}>{TIPO_ICON[ev.tipo] || "📅"}</div>
                          <div style={{ fontSize: "0.7rem", color: "#A8A29E", marginTop: "0.25rem", fontWeight: 600 }}>
                            {fechaLarga(ev.fecha)}
                          </div>
                        </div>
                        {/* Contenido */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
                            <span style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.95rem" }}>{ev.nombre}</span>
                            <span style={{ fontSize: "0.72rem", background: "#FEF0DC", color: "#FB923C", borderRadius: "999px", padding: "0.15rem 0.5rem", fontWeight: 600, whiteSpace: "nowrap" }}>{ev.ciudad}</span>
                          </div>
                          {ev.descripcion && (
                            <p style={{ margin: "0 0 0.35rem", fontSize: "0.82rem", color: "#78716C", lineHeight: 1.5 }}>{ev.descripcion}</p>
                          )}
                          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "#A8A29E", flexWrap: "wrap", alignItems: "center" }}>
                            {ev.hora_inicio && <span>🕐 {ev.hora_inicio}</span>}
                            {ev.direccion && <span>📍 {ev.direccion}</span>}
                            <span style={{ color: "#FB923C", fontWeight: 600 }}>
                              {abierto ? "Ocultar locales ↑" : "Ver locales cercanos ↓"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Panel de locales expandible */}
                      {abierto && (
                        <div onClick={e => e.stopPropagation()}>
                          <LocalesPanel eventoId={ev.id} radio={ev.radio_m} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
