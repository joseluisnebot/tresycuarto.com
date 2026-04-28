"use client";
import citiesData from "./../data/cities.json";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useTurnstile } from "./components/useTurnstile";

const TODAS_CIUDADES = (citiesData as { nombre: string }[]).map(c => c.nombre);

const TIPO_EVENTO_ICON: Record<string, string> = {
  procesion: "⛪", feria: "🎡", concierto: "🎵", música: "🎵",
  festival: "🎪", deporte: "⚽", escena: "🎭", mercado: "🛍️", otro: "📅",
};
const MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function ciudadSlug(ciudad: string): string {
  return ciudad.toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i").replace(/ó/g,"o")
    .replace(/ú/g,"u").replace(/ü/g,"u").replace(/ñ/g,"n").replace(/ç/g,"c")
    .replace(/à/g,"a").replace(/è/g,"e").replace(/ï/g,"i").replace(/ò/g,"o")
    .replace(/·/g,"").replace(/\s+/g,"-");
}

const FEATURES = [
  { icon: "🗺️", bg: "#FEF3C7", title: "Locales cerca de ti",
    desc: "Más de 10.000 bares, terrazas y cafés mapeados en toda España. Filtra por ciudad, tipo y ambiente." },
  { icon: "🕒", bg: "#EDE9FE", title: "Horario de tarde",
    desc: "Solo locales que abren entre las 16h y las 21h. Sin sorpresas, sin perder el tiempo." },
  { icon: "☀️", bg: "#FCE7F3", title: "Fichas completas",
    desc: "Dirección, Instagram, terraza, música en vivo. Todo lo que necesitas antes de salir." },
];

type Status = "idle" | "loading" | "ok" | "error";
type Evento = {
  id: number; nombre: string; tipo: string; ciudad: string;
  fecha: string; hora_inicio: string | null;
  descripcion?: string; direccion?: string;
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [busqueda, setBusqueda] = useState("");
  const [ciudadBusqueda, setCiudadBusqueda] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { containerRef, getToken } = useTurnstile();
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    fetch("/api/eventos?limit=6")
      .then(r => r.json())
      .then(d => setEventos(d.eventos || []))
      .catch(() => {});
  }, []);

  // Suggestions for hero search bar
  const sugerenciasHero = busqueda.length >= 2
    ? TODAS_CIUDADES.filter(c => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
        .includes(busqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""))).slice(0, 6)
    : [];

  // Suggestions for form city search
  const sugerenciasForm = ciudadBusqueda.length >= 1
    ? TODAS_CIUDADES.filter(c =>
        c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
          .includes(ciudadBusqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""))
        && !ciudades.includes(c)
      )
    : [];

  function toggleCiudad(c: string) {
    setCiudades(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    const slug = ciudadSlug(busqueda.trim());
    if (slug) window.location.href = `/locales/${slug}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || ciudades.length === 0) return;
    setStatus("loading");
    try {
      const cf_token = await getToken();
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ciudades, cf_token, replace: true }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main style={{ background: "var(--cream)", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem",
        borderBottom: "1px solid var(--border)",
        background: "rgba(255,248,239,0.9)",
        backdropFilter: "blur(8px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)" }}>
          tres<span style={{ color: "var(--peach)" }}>y</span>cuarto
        </span>
        <a href="/para-locales" style={{ textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, color: "#78716C", padding: "0.4rem 0.9rem", borderRadius: "0.6rem", border: "1px solid #F5E6D3", background: "white" }}>
          Soy propietario
        </a>
      </nav>

      {/* HERO */}
      <section style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", textAlign: "center",
        padding: "5rem 1.5rem 4rem", gap: "1.75rem",
        background: "linear-gradient(180deg, #FFF8EF 0%, #FEF0DC 100%)",
      }}>
        <div className="fade-up delay-1" style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "radial-gradient(circle, #FCD34D 0%, #FB923C 60%, transparent 100%)",
          boxShadow: "0 0 55px 18px rgba(252,211,77,0.3)",
        }} />

        <div className="fade-up delay-1">
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "var(--peach)", background: "var(--peach-soft)", padding: "0.35rem 1rem", borderRadius: "999px",
          }}>El tardeo empieza aquí</span>
        </div>

        <h1 className="fade-up delay-2" style={{
          fontSize: "clamp(2.2rem, 6vw, 3.75rem)", fontWeight: 900,
          letterSpacing: "-0.04em", lineHeight: 1.1, maxWidth: "600px", color: "var(--text)",
        }}>
          Descubre dónde<br />
          <span style={{ color: "var(--peach)" }}>tardear</span>{" "}
          <span style={{ color: "var(--golden)" }}>en tu ciudad</span>
        </h1>

        <p className="fade-up delay-3" style={{
          color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: "420px", lineHeight: 1.7,
        }}>
          Bares, terrazas y locales de tarde seleccionados para que tus domingos
          empiecen a las cuatro, no a las doce.
        </p>

        {/* BUSCADOR HERO */}
        <div style={{ width: "100%", maxWidth: "480px", position: "relative", zIndex: 30 }}>
          <form onSubmit={handleBuscar} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Busca tu ciudad... Madrid, Gandía, Marbella..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onBlur={() => setBusqueda("")}
              style={{
                flex: 1, padding: "0.9rem 1.2rem", borderRadius: "0.875rem",
                border: "1.5px solid var(--peach-soft)", background: "white",
                color: "var(--text)", fontSize: "1rem", outline: "none",
                boxShadow: "0 2px 12px rgba(251,146,60,0.1)",
              }}
            />
            <button type="submit" onMouseDown={e => e.preventDefault()} style={{
              padding: "0.9rem 1.4rem", borderRadius: "0.875rem",
              background: "linear-gradient(135deg, var(--peach) 0%, var(--golden) 100%)",
              color: "white", fontWeight: 800, fontSize: "1rem",
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
              whiteSpace: "nowrap",
            }}>Buscar 🔍</button>
          </form>
          {sugerenciasHero.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: "white", borderRadius: "0.875rem", marginTop: "0.3rem",
              border: "1.5px solid var(--peach-soft)", overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 20,
            }}>
              {sugerenciasHero.map(c => (
                <div key={c}
                  onMouseDown={e => { e.preventDefault(); window.location.href = `/locales/${ciudadSlug(c)}`; }}
                  style={{
                    padding: "0.7rem 1.2rem", cursor: "pointer",
                    color: "var(--text)", fontSize: "0.95rem",
                    fontWeight: 500, borderBottom: "1px solid var(--peach-soft)",
                  }}>
                  📍 {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FORM NEWSLETTER */}
        <div className="fade-up delay-4" style={{ width: "100%", maxWidth: "420px", zIndex: 1, position: "relative" }}>
          {status === "ok" ? (
            <div style={{
              background: "#FFFBF5", border: "1px solid var(--border)",
              borderRadius: "1.25rem", padding: "2rem", textAlign: "center",
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎉</div>
              <p style={{ fontWeight: 700, color: "var(--peach)", fontSize: "1.1rem" }}>¡Ya estás dentro!</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.4rem" }}>
                Ya puedes ver los mejores locales en {ciudades.join(", ")}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="email" required placeholder="tu@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={{
                  width: "100%", padding: "0.85rem 1.1rem", borderRadius: "0.875rem",
                  border: "1.5px solid var(--peach-soft)", background: "white",
                  color: "var(--text)", fontSize: "1rem", outline: "none",
                }}
              />

              {/* Ciudad selector */}
              <div style={{ position: "relative" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem", textAlign: "center" }}>
                  ¿En qué ciudades tardeas?
                </p>
                {/* Chips ciudades seleccionadas */}
                {ciudades.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
                    {ciudades.map(c => (
                      <span key={c} style={{
                        display: "flex", alignItems: "center", gap: "0.3rem",
                        padding: "0.3rem 0.75rem", borderRadius: "999px",
                        fontSize: "0.82rem", fontWeight: 600,
                        background: "var(--peach)", color: "white",
                      }}>
                        {c}
                        <button type="button" onClick={() => toggleCiudad(c)} style={{
                          background: "none", border: "none", color: "white",
                          cursor: "pointer", fontSize: "0.9rem", lineHeight: 1,
                          padding: 0, opacity: 0.8,
                        }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Buscador de ciudades */}
                <input
                  type="text"
                  placeholder="Busca tu ciudad..."
                  value={ciudadBusqueda}
                  onChange={e => { setCiudadBusqueda(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  style={{
                    width: "100%", padding: "0.75rem 1rem", borderRadius: "0.875rem",
                    border: "1.5px solid var(--peach-soft)", background: "white",
                    color: "var(--text)", fontSize: "0.95rem", outline: "none",
                  }}
                />
                {/* Dropdown sugerencias */}
                {showDropdown && sugerenciasForm.length > 0 && (
                  <div style={{
                    position: "absolute", left: 0, right: 0,
                    background: "white", borderRadius: "0.875rem", marginTop: "0.3rem",
                    border: "1.5px solid var(--peach-soft)", overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 20,
                  }}>
                    {sugerenciasForm.map(c => (
                      <div key={c}
                        onMouseDown={e => { e.preventDefault(); toggleCiudad(c); setCiudadBusqueda(""); setShowDropdown(false); }}
                        style={{
                          padding: "0.65rem 1rem", cursor: "pointer",
                          fontSize: "0.92rem", color: "var(--text)",
                          borderBottom: "1px solid var(--peach-soft)",
                        }}>
                        📍 {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit" disabled={status === "loading"}
                style={{
                  width: "100%", padding: "0.9rem 1.5rem", borderRadius: "0.875rem",
                  background: "linear-gradient(135deg, var(--peach) 0%, var(--golden) 100%)",
                  color: "white", fontWeight: 800, fontSize: "1rem",
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
                  opacity: status === "loading" ? 0.7 : 1,
                }}
              >
                {status === "loading" ? "Apuntando..." : "Quiero apuntarme 👋"}
              </button>
              {status === "error" && (
                <p style={{ color: "#EF4444", fontSize: "0.85rem", textAlign: "center" }}>
                  Algo falló. Inténtalo de nuevo.
                </p>
              )}
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "center" }}>
                Sin spam. Te mandamos lo mejor de tu ciudad.
              </p>
              <div ref={containerRef} />
            </form>
          )}
        </div>
      </section>

      {/* SAN ISIDRO & FERIAS DE MAYO */}
      <section style={{
        margin: "0", padding: "3rem 1.5rem",
        background: "linear-gradient(135deg, #064E3B 0%, #065F46 50%, #064E3B 100%)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🌼</span>
            <span style={{
              fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#6EE7B7", background: "rgba(110,231,183,0.15)", padding: "0.3rem 0.9rem", borderRadius: "999px",
              border: "1px solid rgba(110,231,183,0.3)",
            }}>Mayo en España · 2026</span>
            <span style={{ fontSize: "1.5rem" }}>🐎</span>
          </div>
          <h2 style={{
            fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 900, letterSpacing: "-0.03em",
            color: "white", marginBottom: "0.6rem", lineHeight: 1.2,
          }}>
            San Isidro y Ferias de Mayo<br />
            <span style={{ color: "#6EE7B7" }}>el mejor mes para tardear</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", maxWidth: "520px", margin: "0 auto 2rem" }}>
            Verbenas de San Isidro en Madrid, Feria del Caballo en Jerez y Feria de Mayo en Córdoba. Terrazas, patios y tardeos de primavera.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem" }}>
            {[
              ["madrid", "🌼 Madrid · San Isidro"],
              ["jerez-de-la-frontera", "🐎 Jerez · Feria del Caballo"],
              ["cordoba", "🌺 Córdoba · Feria de Mayo"],
              ["sevilla", "💃 Sevilla"],
              ["granada", "🎶 Granada"],
              ["cadiz", "🎭 Cádiz"],
            ].map(([slug, nombre]) => (
              <a key={slug} href={`/locales/${slug}`} style={{
                fontSize: "0.85rem", padding: "0.4rem 1rem", borderRadius: "999px",
                background: "rgba(110,231,183,0.1)", color: "#D1FAE5",
                fontWeight: 600, border: "1px solid rgba(110,231,183,0.25)",
                textDecoration: "none",
              }}>{nombre}</a>
            ))}
          </div>
        </div>
      </section>

      {/* PRÓXIMOS EVENTOS */}
      {eventos.length > 0 && (
        <section style={{ padding: "3rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FB923C", margin: "0 0 0.25rem" }}>Agenda</p>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#1C1917", margin: 0, letterSpacing: "-0.02em" }}>Próximos eventos</h2>
            </div>
            <Link href="/eventos" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FB923C", textDecoration: "none" }}>Ver todos →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
            {eventos.map(evento => {
              const fecha = new Date(evento.fecha + "T12:00:00");
              return (
                <a key={evento.id} href={`/locales/${ciudadSlug(evento.ciudad)}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: "white", borderRadius: "1rem", border: "1px solid #F5E6D3",
                    padding: "1rem", display: "flex", gap: "0.85rem", alignItems: "flex-start",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#FB923C"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#F5E6D3"}
                  >
                    <div style={{
                      background: "#FEF0DC", borderRadius: "0.75rem", padding: "0.5rem 0.65rem",
                      textAlign: "center", minWidth: "44px",
                    }}>
                      <div style={{ fontSize: "1.1rem" }}>{TIPO_EVENTO_ICON[evento.tipo] || "📅"}</div>
                      <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#FB923C", lineHeight: 1.2, marginTop: "0.2rem" }}>
                        {fecha.getDate()} {MESES_CORTOS[fecha.getMonth()]}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.88rem", lineHeight: 1.3, marginBottom: "0.2rem" }}>
                        {evento.nombre}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#FB923C", fontWeight: 600 }}>{evento.ciudad}</div>
                      {evento.descripcion && (
                        <div style={{ fontSize: "0.75rem", color: "#78716C", marginTop: "0.25rem", lineHeight: 1.45,
                          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                          {evento.descripcion}
                        </div>
                      )}
                      {evento.direccion && (
                        <div style={{ fontSize: "0.7rem", color: "#A8A29E", marginTop: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          📍 {evento.direccion}
                        </div>
                      )}
                      {evento.hora_inicio && (
                        <div style={{ fontSize: "0.72rem", color: "#A8A29E", marginTop: "0.15rem" }}>🕐 {evento.hora_inicio}</div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section style={{ padding: "4rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: f.bg, borderRadius: "1.25rem", padding: "1.75rem",
              display: "flex", flexDirection: "column", gap: "0.75rem",
              border: "1px solid rgba(0,0,0,0.04)",
            }}>
              <span style={{ fontSize: "2rem" }}>{f.icon}</span>
              <h3 style={{ fontWeight: 700, color: "var(--text)", fontSize: "1rem" }}>{f.title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DISPONIBLE EN */}
      <section style={{ padding: "0 1.5rem 4rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "1rem" }}>
          Disponible en
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem" }}>
          {citiesData.map(c => (
            <a key={c.nombre} href={`/locales/${c.slug}`} style={{
              fontSize: "0.85rem", padding: "0.35rem 0.9rem", borderRadius: "999px",
              background: "var(--lavender-soft)", color: "var(--lavender)",
              fontWeight: 600, border: "1px solid rgba(167,139,250,0.2)",
              textDecoration: "none",
            }}>{c.nombre}</a>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid var(--border)", padding: "1.5rem",
        textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)",
      }}>
        © 2025 tresycuarto.com — Hecho con ☀️ en España
        {" · "}
        <a href="/para-locales" style={{ color: "var(--peach)", textDecoration: "none" }}>¿Tienes un local?</a>
        {" · "}
        <a href="/faq" style={{ color: "var(--text-muted)", textDecoration: "none" }}>FAQ</a>
        {" · "}
        <a href="/contacto" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Contacto</a>
        {" · "}
        <a href="/privacidad" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Privacidad</a>
      </footer>
    </main>
  );
}
