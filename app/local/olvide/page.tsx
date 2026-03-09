"use client";

import { useState } from "react";
import Link from "next/link";
import { useTurnstile } from "../../components/useTurnstile";

export default function OlvideContrasena() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const { containerRef, getToken } = useTurnstile();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const cf_token = await getToken();
    const res = await fetch("/api/local/reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, cf_token }),
    });

    if (res.status === 403) {
      const data = await res.json();
      setError(data.error || "Verificación fallida");
      setLoading(false);
      return;
    }

    // Siempre mostramos éxito (no revelamos si el email existe)
    setDone(true);
    setLoading(false);
  }

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: "1.5rem", border: "1px solid #F5E6D3", padding: "2rem", width: "100%", maxWidth: "400px" }}>

        <Link href="/" style={{ textDecoration: "none", display: "block", textAlign: "center", marginBottom: "1.5rem", fontWeight: 800, fontSize: "1.25rem", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>

        {!done ? (
          <>
            <h1 style={{ fontWeight: 800, fontSize: "1.2rem", color: "#1C1917", marginBottom: "0.35rem" }}>¿Olvidaste tu contraseña?</h1>
            <p style={{ fontSize: "0.85rem", color: "#78716C", marginBottom: "1.5rem" }}>
              Escribe tu email y te mandamos un enlace para restablecerla.
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <input
                type="email" required placeholder="tu@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: "0.75rem", border: "1.5px solid #F5E6D3", fontSize: "1rem", outline: "none" }}
                autoFocus
              />
              {error && <p style={{ color: "#EF4444", fontSize: "0.85rem" }}>{error}</p>}
              <button type="submit" disabled={loading} style={{
                padding: "0.9rem", borderRadius: "0.875rem", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 800, fontSize: "1rem",
              }}>
                {loading ? "Enviando..." : "Enviar enlace →"}
              </button>
              <div ref={containerRef} />
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📬</div>
            <h2 style={{ fontWeight: 800, color: "#1C1917", marginBottom: "0.5rem" }}>Revisa tu email</h2>
            <p style={{ fontSize: "0.88rem", color: "#78716C", lineHeight: 1.6 }}>
              Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña. Válido durante 1 hora.
            </p>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: "0.82rem", color: "#A8A29E", marginTop: "1.5rem" }}>
          <Link href="/local/login" style={{ color: "#FB923C", fontWeight: 700, textDecoration: "none" }}>
            ← Volver al login
          </Link>
        </p>

      </div>
    </main>
  );
}
