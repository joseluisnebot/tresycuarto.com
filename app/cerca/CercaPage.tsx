"use client";

import { useState } from "react";
import Link from "next/link";
import cities from "../../data/cities.json";

type Local = {
  id: string;
  nombre: string;
  tipo: string;
  ciudad: string;
  slug: string;
  direccion: string | null;
  terraza: number | null;
  outdoor_seating: number | null;
  photo_url: string | null;
  rating: number | null;
  rating_count: number | null;
  distancia: number;
};

type Estado = "idle" | "buscando" | "ok" | "denegado" | "error" | "sin-resultados";

const RADIOS = [500, 1000, 2000];

// El endpoint devuelve el nombre de la ciudad, no su slug. Se usa el mapa oficial
// de cities.json y, si la ciudad no está listada, se normaliza el nombre igual que
// en el resto del sitio.
const SLUG_POR_NOMBRE: Record<string, string> = Object.fromEntries(
  (cities as { slug: string; nombre: string }[]).map(c => [c.nombre, c.slug])
);
function ciudadSlug(nombre: string) {
  return SLUG_POR_NOMBRE[nombre]
    ?? nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function distanciaStr(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export default function CercaPage() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [locales, setLocales] = useState<Local[]>([]);
  const [radio, setRadio] = useState(1000);

  async function buscar(r: number) {
    setRadio(r);
    if (!("geolocation" in navigator)) { setEstado("error"); return; }
    setEstado("buscando");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/app/cercanos?lat=${latitude}&lon=${longitude}&radio=${r}`);
          if (!res.ok) { setEstado("error"); return; }
          const data = await res.json();
          const list: Local[] = data.locales || [];
          setLocales(list);
          setEstado(list.length ? "ok" : "sin-resultados");
        } catch {
          setEstado("error");
        }
      },
      err => setEstado(err.code === err.PERMISSION_DENIED ? "denegado" : "error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  const btn: React.CSSProperties = {
    padding: "0.85rem 1.75rem", borderRadius: "999px", border: "none",
    background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white",
    fontWeight: 800, fontSize: "1rem", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
  };

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3",
        background: "rgba(255,248,239,0.95)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
      </nav>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        <h1 style={{ fontWeight: 900, fontSize: "1.75rem", color: "#1C1917", letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
          Tardeo cerca de ti
        </h1>
        <p style={{ color: "#78716C", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Bares, cafeterías y terrazas a un paseo de donde estás ahora.
        </p>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {RADIOS.map(r => (
            <button
              key={r}
              onClick={() => buscar(r)}
              disabled={estado === "buscando"}
              style={{
                padding: "0.5rem 1.1rem", borderRadius: "999px", cursor: "pointer",
                border: radio === r && estado === "ok" ? "1.5px solid #FB923C" : "1.5px solid #F5E6D3",
                background: radio === r && estado === "ok" ? "#FEF0DC" : "white",
                color: radio === r && estado === "ok" ? "#B45309" : "#78716C",
                fontWeight: 700, fontSize: "0.85rem",
              }}
            >
              {r < 1000 ? `${r} m` : `${r / 1000} km`}
            </button>
          ))}
        </div>

        {estado === "idle" && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "white", border: "1px solid #F5E6D3", borderRadius: "1.25rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📍</div>
            <p style={{ color: "#78716C", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Usamos tu ubicación solo para esta búsqueda. No la guardamos.
            </p>
            <button onClick={() => buscar(radio)} style={btn}>Buscar cerca de mí →</button>
          </div>
        )}

        {estado === "buscando" && (
          <p style={{ textAlign: "center", padding: "3rem", color: "#A8A29E" }}>Buscando locales cerca…</p>
        )}

        {estado === "denegado" && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "white", border: "1px solid #F5E6D3", borderRadius: "1.25rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔒</div>
            <p style={{ color: "#78716C", marginBottom: "1rem", lineHeight: 1.6 }}>
              No nos has dado permiso de ubicación. Puedes activarlo en los ajustes del
              navegador, o elegir tu ciudad a mano.
            </p>
            <Link href="/" style={{ ...btn, display: "inline-block", textDecoration: "none" }}>Ver ciudades →</Link>
          </div>
        )}

        {(estado === "error" || estado === "sin-resultados") && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "white", border: "1px solid #F5E6D3", borderRadius: "1.25rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{estado === "error" ? "😕" : "🗺️"}</div>
            <p style={{ color: "#78716C", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              {estado === "error"
                ? "No hemos podido obtener tu ubicación. Inténtalo de nuevo."
                : `No hay locales a menos de ${radio < 1000 ? `${radio} m` : `${radio / 1000} km`}. Prueba a ampliar el radio.`}
            </p>
            <button onClick={() => buscar(radio)} style={btn}>Reintentar</button>
          </div>
        )}

        {estado === "ok" && (
          <>
            <p style={{ color: "#A8A29E", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
              {locales.length} {locales.length === 1 ? "local" : "locales"} cerca de ti
            </p>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {locales.map(l => (
                <Link
                  key={l.id}
                  href={`/locales/${ciudadSlug(l.ciudad)}/${l.slug}`}
                  style={{
                    textDecoration: "none", background: "white", border: "1px solid #F5E6D3",
                    borderRadius: "1rem", padding: "1rem 1.1rem", display: "flex",
                    alignItems: "center", gap: "0.9rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.98rem", marginBottom: "0.2rem" }}>
                      {l.nombre}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#A8A29E" }}>
                      {distanciaStr(l.distancia)}
                      {l.rating ? ` · ⭐ ${Number(l.rating).toFixed(1)}` : ""}
                      {(l.terraza || l.outdoor_seating) ? " · Terraza ☀️" : ""}
                    </div>
                    {l.direccion && (
                      <div style={{ fontSize: "0.78rem", color: "#C4BFB8", marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.direccion}
                      </div>
                    )}
                  </div>
                  <span style={{ color: "#FB923C", fontWeight: 800 }}>→</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
