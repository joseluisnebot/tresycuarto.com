"use client";

import { useState } from "react";
import { useTurnstile } from "./useTurnstile";

// Bloque de alta a la newsletter para páginas de servidor (rutas), que no pueden
// llevar formulario propio. La página de ciudad tiene su propia copia inline
// porque allí comparte estado con el formulario de "ciudad próximamente".
export default function SuscribirCiudad({ ciudad, ruta }: { ciudad: string; ruta?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const { containerRef, getToken } = useTurnstile();

  return (
    <div style={{
      marginTop: "2.5rem", background: "white", border: "1px solid #F5E6D3",
      borderRadius: "1.25rem", padding: "1.75rem 1.5rem", textAlign: "center",
    }}>
      {status === "ok" ? (
        <>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
          <p style={{ fontWeight: 700, color: "#166534", marginBottom: "0.25rem" }}>¡Apuntado!</p>
          <p style={{ color: "#15803D", fontSize: "0.9rem" }}>
            Revisa tu correo: ahí tienes la ruta para llevarla en el móvil.
          </p>
        </>
      ) : (
        <>
          <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>☀️</div>
          <h2 style={{ fontWeight: 800, color: "#1C1917", fontSize: "1.15rem", marginBottom: "0.4rem", letterSpacing: "-0.02em" }}>
            ¿Te mandamos esta ruta al correo?
          </h2>
          <p style={{ color: "#78716C", maxWidth: "420px", margin: "0 auto 1.25rem", lineHeight: 1.6, fontSize: "0.92rem" }}>
            Para llevarla en el móvil, con sus paradas. Y te avisamos de los planes de tarde que salgan en {ciudad}.
          </p>
          <div ref={containerRef} />
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!email) return;
              setStatus("loading");
              try {
                const cf_token = await getToken();
                const res = await fetch("/api/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, ciudad, ruta, cf_token }),
                });
                setStatus(res.ok ? "ok" : "error");
              } catch {
                setStatus("error");
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
              <button type="submit" disabled={status === "loading"} style={{
                padding: "0.85rem 1.5rem", borderRadius: "0.875rem", border: "none",
                background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white",
                fontWeight: 800, fontSize: "1rem", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
                opacity: status === "loading" ? 0.7 : 1,
              }}>
                {status === "loading" ? "..." : "Mandármela →"}
              </button>
            </div>
            {status === "error" && (
              <p style={{ color: "#DC2626", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                Error al suscribirse. Inténtalo de nuevo.
              </p>
            )}
            <p style={{ fontSize: "0.75rem", color: "#A8A29E", marginTop: "0.75rem" }}>
              Sin spam. Puedes darte de baja cuando quieras.
            </p>
          </form>
        </>
      )}
    </div>
  );
}
