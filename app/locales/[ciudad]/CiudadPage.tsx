"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTurnstile } from "../../components/useTurnstile";
import citiesData from "../../../data/cities.json";
import ciudadContentData from "../../../data/ciudad-content.json";
import rutasData from "../../../data/rutas.json";
import dynamic from "next/dynamic";

const MapaLocales = dynamic(() => import("./MapaLocales"), { ssr: false });

const SLUG_A_CIUDAD: Record<string, string> = Object.fromEntries(
  (citiesData as { slug: string; nombre: string }[]).map(c => [c.slug, c.nombre])
);

type CiudadInfo = {
  coords?: { lat: number; lon: number };
  intro?: string;
  barrios?: string[];
  faqs?: { q: string; a: string }[];
};
const CIUDAD_CONTENT = ciudadContentData as Record<string, CiudadInfo>;

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

// Group rutas by city name
const RUTAS_POR_CIUDAD: Record<string, Ruta[]> = {};
for (const r of rutasData as Ruta[]) {
  if (!RUTAS_POR_CIUDAD[r.ciudad]) RUTAS_POR_CIUDAD[r.ciudad] = [];
  RUTAS_POR_CIUDAD[r.ciudad].push(r);
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

const TIPO_LABEL: Record<string, string> = {
  bar: "Bar", pub: "Pub", cafe: "Cafetería", biergarten: "Terraza",
};

const TIPO_EVENTO_ICON: Record<string, string> = {
  procesion: "⛪", feria: "🎡", concierto: "🎵", música: "🎵",
  festival: "🎪", deporte: "⚽", escena: "🎭", mercado: "🛍️", otro: "📅",
};

function ciudadSlug(ciudad: string): string {
  return ciudad
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 12742;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCiudadesCercanas(ciudad: string, n = 5): string[] {
  const coords = CIUDAD_CONTENT[ciudad]?.coords;
  if (!coords) {
    return (citiesData as { nombre: string }[]).filter(c => c.nombre !== ciudad).slice(0, n).map(c => c.nombre);
  }
  return (citiesData as { nombre: string }[])
    .filter(c => c.nombre !== ciudad && CIUDAD_CONTENT[c.nombre]?.coords)
    .map(c => ({
      nombre: c.nombre,
      dist: haversineKm(coords.lat, coords.lon, CIUDAD_CONTENT[c.nombre]!.coords!.lat, CIUDAD_CONTENT[c.nombre]!.coords!.lon),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n)
    .map(c => c.nombre);
}

function wmoIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

type Local = {
  id: string; nombre: string; tipo: string; ciudad: string;
  direccion: string; horario: string | null; horario_google: string | null;
  telefono: string | null; web: string | null; instagram: string | null;
  terraza: number; outdoor_seating?: number; live_music?: number;
  good_for_groups?: number | null; allows_dogs?: number | null;
  lat: number | null; lon: number | null;
  descripcion: string | null; descripcion_google?: string | null;
  photo_url?: string | null; rating?: number | null; rating_count?: number | null;
  price_level?: string | null;
};

type Evento = {
  id: number; nombre: string; tipo: string; ciudad: string;
  fecha: string; hora_inicio: string | null; direccion: string | null;
  descripcion: string | null; lat: number | null; lon: number | null;
  radio_m: number | null;
};

type EventoSeleccionado = {
  evento: Evento;
  locales: Local[];
  lat: number | null;
  lon: number | null;
  radio: number;
};

type WeatherDay = { time: string; temperature_2m_max: number; weathercode: number };

const LIMIT = 24;

export default function CiudadPage({ slug }: { slug: string }) {
  const nombreCiudad = SLUG_A_CIUDAD[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const content = CIUDAD_CONTENT[nombreCiudad] || null;
  const router = useRouter();
  const { containerRef, getToken } = useTurnstile();

  const [locales, setLocales] = useState<Local[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCiudad, setTotalCiudad] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroTerraza, setFiltroTerraza] = useState(false);
  const [weather, setWeather] = useState<WeatherDay[] | null>(null);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [ciudadesCercanas, setCiudadesCercanas] = useState<string[]>([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoSeleccionado | null>(null);
  const [cargandoEventoId, setCargandoEventoId] = useState<number | null>(null);

  async function handleClickEvento(evento: Evento) {
    if (eventoSeleccionado?.evento.id === evento.id) {
      setEventoSeleccionado(null);
      return;
    }
    setCargandoEventoId(evento.id);
    try {
      const r = await fetch(`/api/eventos/${evento.id}/locales`).then(r => r.json());
      if (r.locales && r.evento) {
        setEventoSeleccionado({
          evento,
          locales: r.locales,
          lat: r.evento.lat,
          lon: r.evento.lon,
          radio: r.evento.radio_m ?? 400,
        });
      }
    } finally {
      setCargandoEventoId(null);
    }
  }

  async function seleccionarEventoPorId(id: string) {
    setCargandoEventoId(Number(id));
    try {
      const r = await fetch(`/api/eventos/${id}/locales`).then(r => r.json());
      if (r.locales && r.evento) {
        const evt: Evento = {
          id: r.evento.id, nombre: r.evento.nombre,
          tipo: r.evento.tipo || "otro", ciudad: r.evento.ciudad || nombreCiudad,
          fecha: r.evento.fecha || "", hora_inicio: r.evento.hora_inicio,
          direccion: r.evento.direccion, descripcion: r.evento.descripcion || "",
          radio_m: r.evento.radio_m, lat: r.evento.lat, lon: r.evento.lon,
        };
        setEventoSeleccionado({
          evento: evt, locales: r.locales,
          lat: r.evento.lat, lon: r.evento.lon, radio: r.evento.radio_m ?? 400,
        });
      }
    } finally {
      setCargandoEventoId(null);
    }
  }

  // Auto-select event from URL ?evento=ID
  useEffect(() => {
    const eventoId = new URLSearchParams(window.location.search).get("evento");
    if (eventoId) seleccionarEventoPorId(eventoId);
  }, []);

  // Nearby cities by haversine
  useEffect(() => {
    setCiudadesCercanas(getCiudadesCercanas(nombreCiudad, 5));
  }, [nombreCiudad]);

  // Load upcoming events for this city
  useEffect(() => {
    fetch(`/api/eventos?ciudad=${encodeURIComponent(nombreCiudad)}&limit=5`)
      .then(r => r.json())
      .then(d => setEventos(d.eventos || []))
      .catch(() => {});
  }, [nombreCiudad]);

  // Weather
  useEffect(() => {
    const coords = content?.coords;
    if (!coords) return;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,weathercode&timezone=Europe%2FMadrid&forecast_days=5`
    )
      .then(r => r.json())
      .then(d => {
        if (!d?.daily) return;
        const { time, temperature_2m_max, weathercode } = d.daily;
        setWeather(time.map((t: string, i: number) => ({
          time: t, temperature_2m_max: temperature_2m_max[i], weathercode: weathercode[i],
        })));
      })
      .catch(() => {});
  }, [content]);

  // Total sin filtrar
  useEffect(() => {
    fetch(`/api/locales?ciudad=${encodeURIComponent(nombreCiudad)}&limit=1&offset=0`)
      .then(r => r.json())
      .then(d => setTotalCiudad(d.total || 0))
      .catch(() => setTotalCiudad(0));
  }, [nombreCiudad]);

  // Locales filtrados
  useEffect(() => {
    setLoading(true);
    let url = `/api/locales?ciudad=${encodeURIComponent(nombreCiudad)}&limit=${LIMIT}&offset=${offset}`;
    if (filtroTipo) url += `&tipo=${filtroTipo}`;
    if (filtroTerraza) url += `&terraza=1`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setLocales(d.locales || []); setTotal(d.total || 0); })
      .catch(() => setLocales([]))
      .finally(() => setLoading(false));
  }, [nombreCiudad, offset, filtroTipo, filtroTerraza]);

  const noData = totalCiudad === 0 && !loading;
  const hayFiltroActivo = !!filtroTipo || filtroTerraza;
  const sinResultadosFiltro = !loading && locales.length === 0 && hayFiltroActivo;

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3",
        background: "rgba(255,248,239,0.95)", position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(8px)", gap: "1rem",
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#1C1917", flexShrink: 0 }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>

        {/* Tiempo en el nav */}
        {weather && weather.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden", flexShrink: 1 }}>
            <span style={{ fontSize: "0.72rem", color: "#A8A29E", fontWeight: 600, whiteSpace: "nowrap" }}>
              {nombreCiudad}
            </span>
            {weather.slice(0, 5).map((d, i) => {
              const date = new Date(d.time + "T12:00:00");
              const dia = i === 0 ? "Hoy" : DIAS[date.getDay()];
              return (
                <span key={d.time} style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                  <span>{wmoIcon(d.weathercode)}</span>
                  <span style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.85rem" }}>{Math.round(d.temperature_2m_max)}°</span>
                  <span style={{ fontSize: "0.72rem", color: "#A8A29E" }}>{dia}</span>
                </span>
              );
            })}
          </div>
        )}

        <Link href="/para-locales" style={{
          textDecoration: "none", fontSize: "0.85rem", fontWeight: 700, color: "white",
          background: "linear-gradient(135deg,#FB923C,#F59E0B)", padding: "0.4rem 0.9rem",
          borderRadius: "0.6rem", flexShrink: 0,
        }}>
          Soy propietario
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
        }}>Tardeo en</span>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 900, color: "#1C1917", margin: "0.75rem 0 0.5rem" }}>
          {nombreCiudad}
        </h1>
        {!loading && total > 0 && (
          <p style={{ color: "#78716C", fontSize: "1rem" }}>
            {total.toLocaleString("es-ES")} locales mapeados
          </p>
        )}
      </div>

      {/* Ciudades cercanas por proximidad */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.4rem", padding: "0.75rem 1.5rem 0" }}>
        <a href={`/locales/${slug}`} style={{
          fontSize: "0.8rem", fontWeight: 600, padding: "0.3rem 0.8rem", borderRadius: "999px",
          background: "#7C3AED", color: "white", border: "1.5px solid transparent", textDecoration: "none",
        }}>{nombreCiudad}</a>
        {ciudadesCercanas.map(c => (
          <a key={c} href={`/locales/${ciudadSlug(c)}`} style={{
            fontSize: "0.8rem", fontWeight: 600, padding: "0.3rem 0.8rem", borderRadius: "999px",
            background: "#EDE9FE", color: "#7C3AED", border: "1.5px solid transparent", textDecoration: "none",
          }}>{c}</a>
        ))}
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem" }}>

        {/* Intro + barrios */}
        {content?.intro && !noData && (
          <div style={{
            background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3",
            padding: "1.5rem", marginBottom: "1.5rem",
          }}>
            <p style={{ color: "#57534E", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: content.barrios ? "1rem" : 0 }}>
              {content.intro}
            </p>
            {content.barrios && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {content.barrios.map(b => (
                  <span key={b} style={{
                    fontSize: "0.78rem", fontWeight: 600, color: "#7C3AED",
                    background: "#EDE9FE", padding: "0.2rem 0.7rem", borderRadius: "999px",
                  }}>📍 {b}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        {!noData && totalCiudad !== null && totalCiudad > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {(["", "bar", "pub", "cafe"] as const).map(t => (
              <button key={t} onClick={() => { setFiltroTipo(t); setFiltroTerraza(false); setOffset(0); }} style={{
                padding: "0.4rem 1rem", borderRadius: "999px", border: "1.5px solid",
                borderColor: filtroTipo === t && !filtroTerraza ? "#FB923C" : "#F5E6D3",
                background: filtroTipo === t && !filtroTerraza ? "#FEF0DC" : "white",
                color: filtroTipo === t && !filtroTerraza ? "#FB923C" : "#78716C",
                fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
              }}>
                {t === "" ? "Todos" : (TIPO_LABEL[t] || t)}
              </button>
            ))}
            <button onClick={() => { setFiltroTerraza(!filtroTerraza); setFiltroTipo(""); setOffset(0); }} style={{
              padding: "0.4rem 1rem", borderRadius: "999px", border: "1.5px solid",
              borderColor: filtroTerraza ? "#FB923C" : "#F5E6D3",
              background: filtroTerraza ? "#FEF0DC" : "white",
              color: filtroTerraza ? "#FB923C" : "#78716C",
              fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
            }}>☀️ Con terraza</button>
          </div>
        )}

        {/* Sin resultados con filtro */}
        {sinResultadosFiltro && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#78716C" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔍</div>
            <p style={{ fontWeight: 600 }}>No hay locales con ese filtro en {nombreCiudad}</p>
            <button onClick={() => { setFiltroTipo(""); setFiltroTerraza(false); setOffset(0); }} style={{
              marginTop: "1rem", padding: "0.5rem 1.2rem", borderRadius: "999px",
              border: "1.5px solid #F5E6D3", background: "white", color: "#FB923C",
              fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            }}>Ver todos los locales</button>
          </div>
        )}

        {/* Cargando */}
        {loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: "#A8A29E" }}>
            Cargando locales...
          </div>
        )}

        {/* Sin datos — formulario de aviso */}
        {noData && (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗺️</div>
            <h2 style={{ fontWeight: 800, color: "#1C1917", fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              {nombreCiudad} llega pronto
            </h2>
            <p style={{ color: "#78716C", maxWidth: "400px", margin: "0.5rem auto 1.5rem", lineHeight: 1.6 }}>
              Estamos mapeando los mejores locales de tardeo en {nombreCiudad}. Déjanos tu email y te avisamos cuando estén listos.
            </p>
            {subscribeStatus === "ok" ? (
              <div style={{
                background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: "1rem",
                padding: "1.5rem", maxWidth: "400px", margin: "0 auto",
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
                <p style={{ fontWeight: 700, color: "#166534", marginBottom: "0.25rem" }}>¡Apuntado!</p>
                <p style={{ color: "#15803D", fontSize: "0.9rem", marginBottom: "1rem" }}>
                  Te avisaremos cuando {nombreCiudad} esté disponible.
                </p>
                <Link href="/" style={{ textDecoration: "none", fontWeight: 700, color: "#78716C", fontSize: "0.9rem" }}>
                  Ver otras ciudades →
                </Link>
              </div>
            ) : (
              <>
                <div ref={containerRef} />
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!email) return;
                    setSubscribeStatus("loading");
                    try {
                      const cf_token = await getToken();
                      const res = await fetch("/api/subscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, ciudad: nombreCiudad, cf_token, proximamente: true }),
                      });
                      if (res.ok) {
                        setSubscribeStatus("ok");
                        setTimeout(() => router.push("/"), 3000);
                      } else {
                        setSubscribeStatus("error");
                      }
                    } catch {
                      setSubscribeStatus("error");
                    }
                  }}
                  style={{ maxWidth: "400px", margin: "0 auto" }}
                >
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <input
                      type="email" required placeholder="tu@email.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      style={{
                        flex: 1, minWidth: "200px", padding: "0.85rem 1.1rem",
                        borderRadius: "0.875rem", border: "1.5px solid #F5E6D3",
                        background: "white", fontSize: "1rem", outline: "none", color: "#1C1917",
                      }}
                    />
                    <button type="submit" disabled={subscribeStatus === "loading"} style={{
                      padding: "0.85rem 1.5rem", borderRadius: "0.875rem", border: "none",
                      background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white",
                      fontWeight: 800, fontSize: "1rem", cursor: "pointer",
                      boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
                      opacity: subscribeStatus === "loading" ? 0.7 : 1,
                    }}>
                      {subscribeStatus === "loading" ? "..." : "Avisarme →"}
                    </button>
                  </div>
                  {subscribeStatus === "error" && (
                    <p style={{ color: "#DC2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                      Error al suscribirse. Inténtalo de nuevo.
                    </p>
                  )}
                  <p style={{ fontSize: "0.75rem", color: "#A8A29E", marginTop: "0.75rem" }}>
                    Sin spam. Solo te avisamos cuando {nombreCiudad} esté lista.
                  </p>
                </form>
              </>
            )}
          </div>
        )}

        {/* Mapa */}
        {!loading && (locales.length > 0 || eventoSeleccionado) && (
          <MapaLocales
            locales={eventoSeleccionado ? eventoSeleccionado.locales : locales}
            ciudad={nombreCiudad}
            eventoPin={eventoSeleccionado ? {
              lat: eventoSeleccionado.lat,
              lon: eventoSeleccionado.lon,
              radio: eventoSeleccionado.radio,
              nombre: eventoSeleccionado.evento.nombre,
            } : null}
          />
        )}

        {/* Eventos próximos */}
        {eventos.length > 0 && (
          <div style={{
            background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3",
            padding: "1.25rem", marginBottom: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: "0.95rem", color: "#1C1917" }}>
                📅 Próximos eventos en {nombreCiudad}
              </h3>
              <a href="/eventos" style={{ fontSize: "0.75rem", color: "#FB923C", fontWeight: 600, textDecoration: "none" }}>
                Ver todos →
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {eventos.map(evento => {
                const fecha = new Date(evento.fecha + "T12:00:00");
                const fechaStr = `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
                const seleccionado = eventoSeleccionado?.evento.id === evento.id;
                return (
                  <div
                    key={evento.id}
                    onClick={() => handleClickEvento(evento)}
                    style={{
                      display: "flex", gap: "0.75rem", alignItems: "flex-start",
                      padding: "0.65rem 0.75rem", borderRadius: "0.75rem", cursor: "pointer",
                      background: seleccionado ? "#EDE9FE" : "#FFF8EF",
                      border: `1.5px solid ${seleccionado ? "#7C3AED" : "transparent"}`,
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "1.3rem", lineHeight: 1, paddingTop: "0.1rem" }}>
                      {cargandoEventoId === evento.id ? "⏳" : (TIPO_EVENTO_ICON[evento.tipo] || "📅")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: seleccionado ? "#7C3AED" : "#1C1917" }}>
                        {evento.nombre}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#78716C", marginTop: "0.15rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <span>📅 {fechaStr}</span>
                        {evento.hora_inicio && <span>🕐 {evento.hora_inicio}</span>}
                        {evento.direccion && <span>📍 {evento.direccion}</span>}
                      </div>
                      {evento.descripcion && (
                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#A8A29E", lineHeight: 1.4 }}>
                          {evento.descripcion}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: seleccionado ? "#7C3AED" : "#A8A29E", flexShrink: 0, paddingTop: "0.1rem" }}>
                      {seleccionado ? "Ver locales →" : "Locales →"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid de locales */}
        {!loading && locales.length > 0 && (
          <>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))" }}>
              {locales.map(local => (
                <a key={local.id} href={`/locales/${local.id}`} style={{
                  textDecoration: "none", color: "inherit",
                  background: "white", borderRadius: "1.25rem",
                  border: "1px solid #F5E6D3",
                  display: "flex", flexDirection: "column",
                  overflow: "hidden",
                  transition: "box-shadow 0.15s, transform 0.15s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; (e.currentTarget as HTMLElement).style.transform = ""; }}
                >
                  {(() => {
                    const PLACEHOLDER: Record<string, string> = {
                      bar: "https://pub-f315142d515a4a21824503bd20f56ad3.r2.dev/placeholders/bar.jpg",
                      pub: "https://pub-f315142d515a4a21824503bd20f56ad3.r2.dev/placeholders/pub.jpg",
                      cafe: "https://pub-f315142d515a4a21824503bd20f56ad3.r2.dev/placeholders/cafe.jpg",
                      biergarten: "https://pub-f315142d515a4a21824503bd20f56ad3.r2.dev/placeholders/biergarten.jpg",
                    };
                    const imgSrc = local.photo_url || PLACEHOLDER[local.tipo] || PLACEHOLDER["bar"];
                    return (
                      <div style={{ width: "100%", height: "140px", overflow: "hidden", background: "#F5E6D3" }}>
                        <img src={imgSrc} alt={local.nombre} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER[local.tipo] || PLACEHOLDER["bar"]; }} />
                      </div>
                    );
                  })()}
                  <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                        color: "#FB923C", background: "#FEF0DC", padding: "0.25rem 0.6rem", borderRadius: "999px",
                      }}>
                        {TIPO_LABEL[local.tipo] || "Local"}
                      </span>
                      {(local.terraza === 1 || local.outdoor_seating === 1) && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669", background: "#D1FAE5", padding: "0.25rem 0.6rem", borderRadius: "999px" }}>
                          ☀️ Terraza
                        </span>
                      )}
                      {local.live_music === 1 && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#7C3AED", background: "#EDE9FE", padding: "0.25rem 0.6rem", borderRadius: "999px" }}>
                          🎵 Música
                        </span>
                      )}
                      {local.good_for_groups === 1 && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0369A1", background: "#E0F2FE", padding: "0.25rem 0.6rem", borderRadius: "999px" }}>
                          👥 Para grupos
                        </span>
                      )}
                      {local.allows_dogs === 1 && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#92400E", background: "#FEF3C7", padding: "0.25rem 0.6rem", borderRadius: "999px" }}>
                          🐾 Pet-friendly
                        </span>
                      )}
                      {local.price_level && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#78716C", marginLeft: "auto" }}>
                          {local.price_level}
                        </span>
                      )}
                    </div>
                    <h2 style={{ fontWeight: 700, color: "#1C1917", fontSize: "1rem", margin: 0, lineHeight: 1.3 }}>
                      {local.nombre}
                    </h2>
                    {local.rating && local.rating > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <span style={{ color: "#F59E0B", fontSize: "0.82rem" }}>
                          {"★".repeat(Math.round(local.rating))}{"☆".repeat(5 - Math.round(local.rating))}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1C1917" }}>{local.rating.toFixed(1)}</span>
                        {local.rating_count && (
                          <span style={{ fontSize: "0.75rem", color: "#A8A29E" }}>({local.rating_count.toLocaleString("es-ES")})</span>
                        )}
                      </div>
                    )}
                    {local.descripcion_google && (
                      <p style={{
                        fontSize: "0.78rem", color: "#78716C", margin: 0, lineHeight: 1.5,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      } as React.CSSProperties}>
                        {local.descripcion_google}
                      </p>
                    )}
                    {local.direccion && (
                      <p style={{ fontSize: "0.78rem", color: "#A8A29E", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📍 {local.direccion}
                      </p>
                    )}
                    {(local.horario || local.horario_google) && (
                      <p style={{ fontSize: "0.78rem", color: "#A8A29E", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🕒 {local.horario || local.horario_google?.split(" | ")[0]}
                      </p>
                    )}
                  </div>
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

        {/* Rutas de tardeo */}
        {RUTAS_POR_CIUDAD[nombreCiudad] && !noData && offset === 0 && (
          <div style={{ marginTop: "2.5rem" }}>
            <h2 style={{ fontWeight: 800, color: "#1C1917", fontSize: "1rem", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
              🗺️ Rutas de tardeo en {nombreCiudad}
            </h2>
            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))" }}>
              {RUTAS_POR_CIUDAD[nombreCiudad].map(ruta => (
                <Link key={ruta.slug} href={`/rutas/${ruta.slug}`} style={{
                  textDecoration: "none", background: "white", borderRadius: "1rem",
                  border: "1px solid #F5E6D3", padding: "1rem 1.1rem", display: "block",
                }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>
                    {ruta.barrio}
                  </div>
                  <div style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.9rem", lineHeight: 1.3, marginBottom: "0.4rem" }}>
                    {ruta.titulo}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#A8A29E" }}>
                    ⏱ {ruta.duracion} · {ruta.mejor_dia}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        {content?.faqs && !noData && offset === 0 && (
          <div style={{ marginTop: "2.5rem" }}>
            <h2 style={{ fontWeight: 800, color: "#1C1917", fontSize: "1rem", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
              Preguntas frecuentes sobre el tardeo en {nombreCiudad}
            </h2>
            {content.faqs.map((f, i) => (
              <div key={i} style={{
                background: "white", border: "1px solid #F5E6D3", borderRadius: "1rem",
                padding: "1.1rem 1.25rem", marginBottom: "0.6rem",
              }}>
                <p style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.9rem", marginBottom: "0.4rem" }}>{f.q}</p>
                <p style={{ color: "#57534E", fontSize: "0.85rem", lineHeight: 1.6 }}>{f.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ borderTop: "1px solid #F5E6D3", padding: "2rem 1.5rem", textAlign: "center", marginTop: "4rem" }}>
        <p style={{ fontSize: "0.8rem", color: "#A8A29E" }}>
          <Link href="/" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 700 }}>tresycuarto.com</Link>
          {" · "}El tardeo en España{" · "}
          <Link href="/faq" style={{ color: "#A8A29E", textDecoration: "none" }}>FAQ</Link>
          {" · "}
          <Link href="/contacto" style={{ color: "#A8A29E", textDecoration: "none" }}>Contacto</Link>
        </p>
      </footer>
    </main>
  );
}
