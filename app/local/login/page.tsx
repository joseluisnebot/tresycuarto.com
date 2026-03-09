"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LocalOption = { local_id: string; slug: string; nombre: string; ciudad: string };

export default function LocalLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetOk, setResetOk] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "ok") setResetOk(true);
  }, []);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Selector de local (cuando el usuario tiene más de uno)
  const [step, setStep] = useState<"login" | "select_local">("login");
  const [locales, setLocales] = useState<LocalOption[]>([]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.85rem 1rem", borderRadius: "0.75rem",
    border: "1.5px solid #F5E6D3", fontSize: "1rem", outline: "none",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/local/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al iniciar sesión");
      setLoading(false);
      return;
    }

    localStorage.setItem("local_token", data.token);

    if (data.locales && data.locales.length > 1) {
      // Más de un local — mostrar selector
      setLocales(data.locales);
      setStep("select_local");
      setLoading(false);
      return;
    }

    // Un solo local (o ninguno) — ir al dashboard directamente
    if (data.local_id) localStorage.setItem("local_id", data.local_id);
    router.push("/local/dashboard");
  }

  function seleccionarLocal(local: LocalOption) {
    localStorage.setItem("local_id", local.local_id);
    router.push("/local/dashboard");
  }

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: "1.5rem", border: "1px solid #F5E6D3", padding: "2rem", width: "100%", maxWidth: "400px" }}>

        <Link href="/" style={{ textDecoration: "none", display: "block", textAlign: "center", marginBottom: "1.5rem", fontWeight: 800, fontSize: "1.25rem", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
          <span style={{ display: "block", fontSize: "0.8rem", color: "#78716C", fontWeight: 400, marginTop: "0.2rem" }}>Panel de propietarios</span>
        </Link>

        {step === "login" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Contraseña</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              padding: "0.9rem", borderRadius: "0.875rem", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 800, fontSize: "1rem",
              marginTop: "0.25rem",
            }}>
              {loading ? "Entrando..." : "Entrar →"}
            </button>
            {resetOk && <p style={{ color: "#059669", fontSize: "0.85rem", textAlign: "center", background: "#D1FAE5", padding: "0.6rem", borderRadius: "0.6rem" }}>Contraseña actualizada. Ya puedes entrar.</p>}
            {error && <p style={{ color: "#EF4444", fontSize: "0.85rem", textAlign: "center" }}>{error}</p>}
          </form>
        )}

        {step === "select_local" && (
          <div>
            <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.35rem" }}>Elige tu local</p>
            <p style={{ fontSize: "0.82rem", color: "#78716C", marginBottom: "1.25rem" }}>Tu cuenta tiene varios locales. ¿A cuál quieres acceder?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {locales.map(l => (
                <button key={l.local_id} onClick={() => seleccionarLocal(l)} style={{
                  width: "100%", textAlign: "left", padding: "0.85rem 1rem", borderRadius: "0.875rem",
                  border: "1.5px solid #FB923C", background: "white", cursor: "pointer",
                }}>
                  <div style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.95rem" }}>{l.nombre || l.local_id}</div>
                  <div style={{ fontSize: "0.78rem", color: "#78716C", marginTop: "0.15rem" }}>{l.ciudad}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: "0.82rem", marginTop: "1rem" }}>
          <Link href="/local/olvide" style={{ color: "#A8A29E", textDecoration: "none" }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#A8A29E", marginTop: "0.75rem" }}>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/local/registro" style={{ color: "#FB923C", fontWeight: 700, textDecoration: "none" }}>
            Registra tu local
          </Link>
        </p>

      </div>
    </main>
  );
}
