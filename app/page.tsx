"use client";

import { useState } from "react";
import { useTurnstile } from "./components/useTurnstile";

const CIUDADES = [
  "Madrid","Barcelona","Valencia","Sevilla",
  "Bilbao","Málaga","Zaragoza","Murcia",
];

const FEATURES = [
  { icon: "🗺️", bg: "#FEF3C7", title: "Locales cerca de ti",
    desc: "Más de 10.000 bares, terrazas y cafés mapeados en toda España. Filtra por ciudad, tipo y ambiente." },
  { icon: "🕒", bg: "#EDE9FE", title: "Horario de tarde",
    desc: "Solo locales que abren entre las 16h y las 21h. Sin sorpresas, sin perder el tiempo." },
  { icon: "☀️", bg: "#FCE7F3", title: "Fichas completas",
    desc: "Dirección, Instagram, terraza, música en vivo. Todo lo que necesitas antes de salir." },
];

type Status = "idle" | "loading" | "ok" | "error";

export default function Home() {
  const [email, setEmail] = useState("");
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const { containerRef, getToken } = useTurnstile();

  function toggleCiudad(c: string) {
    setCiudades(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
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
        body: JSON.stringify({ email, ciudades, cf_token }),
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
          <span style={{ color: "var(--peach)" }}>tardeear</span>{" "}
          <span style={{ color: "var(--golden)" }}>en tu ciudad</span>
        </h1>

        <p className="fade-up delay-3" style={{
          color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: "420px", lineHeight: 1.7,
        }}>
          Bares, terrazas y locales de tarde seleccionados para que tus domingos
          empiecen a las cuatro, no a las doce.
        </p>

        {/* FORM */}
        <div className="fade-up delay-4" style={{ width: "100%", maxWidth: "420px" }}>
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
              <div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem", textAlign: "center" }}>¿En qué ciudades tardeas?</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
                  {CIUDADES.map(c => {
                    const sel = ciudades.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => toggleCiudad(c)} style={{
                        padding: "0.4rem 0.9rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 600,
                        border: sel ? "none" : "1.5px solid var(--peach-soft)",
                        background: sel ? "var(--peach)" : "white",
                        color: sel ? "white" : "var(--text-muted)",
                        cursor: "pointer", transition: "all 0.15s",
                      }}>{c}</button>
                    );
                  })}
                </div>
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

      {/* CIUDADES */}
      <section style={{ padding: "0 1.5rem 4rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "1rem" }}>
          Lanzando en
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem" }}>
          {CIUDADES.map(c => (
            <a key={c} href={`/locales?ciudad=${encodeURIComponent(c)}`} style={{
              fontSize: "0.85rem", padding: "0.35rem 0.9rem", borderRadius: "999px",
              background: "var(--lavender-soft)", color: "var(--lavender)",
              fontWeight: 600, border: "1px solid rgba(167,139,250,0.2)",
              textDecoration: "none",
            }}>{c}</a>
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
