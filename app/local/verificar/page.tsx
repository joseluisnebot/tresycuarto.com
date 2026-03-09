"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerificarEmail() {
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setEstado("error"); return; }

    fetch(`/api/local/verificar?token=${encodeURIComponent(token)}`)
      .then(r => setEstado(r.ok ? "ok" : "error"))
      .catch(() => setEstado("error"));
  }, []);

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: "1.5rem", border: "1px solid #F5E6D3", padding: "2.5rem", width: "100%", maxWidth: "400px", textAlign: "center" }}>

        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.2rem", color: "#1C1917", display: "block", marginBottom: "1.5rem" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>

        {estado === "cargando" && (
          <p style={{ color: "#A8A29E" }}>Verificando...</p>
        )}

        {estado === "ok" && (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
            <h1 style={{ fontWeight: 800, fontSize: "1.3rem", color: "#1C1917", marginBottom: "0.5rem" }}>Email confirmado</h1>
            <p style={{ color: "#78716C", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Tu cuenta está activa. Ya puedes gestionar tu local.</p>
            <Link href="/local/dashboard" style={{
              display: "inline-block", padding: "0.85rem 2rem", borderRadius: "0.875rem",
              background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white",
              fontWeight: 800, textDecoration: "none", fontSize: "0.95rem",
            }}>
              Ir al panel →
            </Link>
          </>
        )}

        {estado === "error" && (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>❌</div>
            <h1 style={{ fontWeight: 800, fontSize: "1.3rem", color: "#1C1917", marginBottom: "0.5rem" }}>Link inválido</h1>
            <p style={{ color: "#78716C", fontSize: "0.9rem", marginBottom: "1.5rem" }}>El link ya fue usado o ha expirado.</p>
            <Link href="/local/login" style={{ color: "#FB923C", fontWeight: 700, textDecoration: "none" }}>Ir al login</Link>
          </>
        )}

      </div>
    </main>
  );
}
