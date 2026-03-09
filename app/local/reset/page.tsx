"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetContrasena() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    setError("");

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setError("Enlace inválido"); setLoading(false); return; }

    const res = await fetch("/api/local/reset-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Error al cambiar la contraseña");
      setLoading(false);
      return;
    }

    // Limpiar sesión local (el servidor ya invalida las del otro lado)
    localStorage.removeItem("local_token");
    localStorage.removeItem("local_id");
    router.push("/local/login?reset=ok");
  }

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: "1.5rem", border: "1px solid #F5E6D3", padding: "2rem", width: "100%", maxWidth: "400px" }}>

        <Link href="/" style={{ textDecoration: "none", display: "block", textAlign: "center", marginBottom: "1.5rem", fontWeight: 800, fontSize: "1.25rem", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>

        <h1 style={{ fontWeight: 800, fontSize: "1.2rem", color: "#1C1917", marginBottom: "0.35rem" }}>Nueva contraseña</h1>
        <p style={{ fontSize: "0.85rem", color: "#78716C", marginBottom: "1.5rem" }}>
          Elige una contraseña segura de al menos 8 caracteres.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Nueva contraseña</label>
            <input
              type="password" required minLength={8} placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: "0.75rem", border: "1.5px solid #F5E6D3", fontSize: "1rem", outline: "none" }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Repite la contraseña</label>
            <input
              type="password" required minLength={8} placeholder="••••••••"
              value={password2} onChange={e => setPassword2(e.target.value)}
              style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: "0.75rem", border: "1.5px solid #F5E6D3", fontSize: "1rem", outline: "none" }}
            />
          </div>
          {error && <p style={{ color: "#EF4444", fontSize: "0.85rem" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            padding: "0.9rem", borderRadius: "0.875rem", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 800, fontSize: "1rem",
          }}>
            {loading ? "Guardando..." : "Guardar contraseña →"}
          </button>
        </form>

      </div>
    </main>
  );
}
