"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const CIUDADES = ["Madrid","Barcelona","Valencia","Sevilla","Bilbao","Málaga","Zaragoza","Murcia"];
const TIPOS = ["bar","cafe","pub","biergarten"];
const TIPO_LABEL: Record<string, string> = { bar:"Bar", cafe:"Cafetería", pub:"Pub", biergarten:"Terraza / Cervecería" };

type Status = "idle" | "loading" | "ok" | "error";

const input: React.CSSProperties = {
  width: "100%", padding: "0.85rem 1rem", borderRadius: "0.75rem",
  border: "1.5px solid #F5E6D3", background: "white",
  color: "#1C1917", fontSize: "0.95rem", outline: "none",
  fontFamily: "inherit",
};

const label: React.CSSProperties = {
  fontSize: "0.78rem", fontWeight: 700, color: "#78716C",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem", display: "block",
};

function UneteForm() {
  const searchParams = useSearchParams();
  const localId = searchParams.get("local");
  const localNombre = searchParams.get("nombre") || "";
  const localCiudad = searchParams.get("ciudad") || "";
  const esClaim = !!localId;

  const [form, setForm] = useState({
    nombre: localNombre, ciudad: localCiudad, direccion: "", telefono: "", web: "",
    instagram: "", tiktok: "", horario: "", tipo: "bar", terraza: false,
    descripcion: "", contacto_email: "", contacto_nombre: "",
  });
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (localNombre) setForm(f => ({ ...f, nombre: localNombre }));
    if (localCiudad) setForm(f => ({ ...f, ciudad: localCiudad }));
  }, [localNombre, localCiudad]);

  function set(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/solicitud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(esClaim ? { local_id: localId, tipo_solicitud: "claim" } : { tipo_solicitud: "nuevo" }),
        }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <main style={{ background: "#FFF8EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: "420px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#1C1917", marginBottom: "0.75rem" }}>
            {esClaim ? "¡Solicitud de claim recibida!" : "¡Solicitud recibida!"}
          </h1>
          <p style={{ color: "#78716C", lineHeight: 1.7 }}>
            {esClaim
              ? <>Revisaremos que eres el propietario de <strong>{form.nombre}</strong> y te contactaremos en <strong>{form.contacto_email}</strong> en breve.</>
              : <>Revisaremos los datos de <strong>{form.nombre}</strong> y te contactaremos en <strong>{form.contacto_email}</strong> en breve.</>
            }
          </p>
          <Link href="/" style={{ display: "inline-block", marginTop: "2rem", color: "#FB923C", fontWeight: 700, textDecoration: "none" }}>← Volver al inicio</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3",
        background: "rgba(255,248,239,0.95)", position: "sticky", top: 0,
        backdropFilter: "blur(8px)", zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: "none", fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
      </nav>

      <div style={{ maxWidth: "620px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FB923C", background: "#FEF0DC", padding: "0.3rem 0.8rem", borderRadius: "999px", display: "inline-block", marginBottom: "1rem" }}>
          Para locales
        </div>
        <h1 style={{ fontSize: "clamp(1.8rem,5vw,2.4rem)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
          {esClaim ? `Reclamar ficha de ${localNombre}` : "Apunta tu local"}
        </h1>
        <p style={{ color: "#78716C", lineHeight: 1.7, marginBottom: "2rem" }}>
          {esClaim
            ? "Rellena tus datos de contacto y cuéntanos que eres el propietario. Lo verificamos y activamos tu ficha."
            : "¿Tienes un bar, cafetería o terraza que merezca estar en el mapa del tardeo? Rellena el formulario y te añadimos gratis."
          }
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Datos del local */}
          <div style={{ background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1C1917", marginBottom: "0.25rem" }}>Datos del local</p>

            <div>
              <label style={label}>Nombre del local *</label>
              <input style={{ ...input, ...(esClaim ? { background: "#FEF9F0", color: "#78716C" } : {}) }}
                required value={form.nombre} readOnly={esClaim}
                onChange={e => !esClaim && set("nombre", e.target.value)} placeholder="Bar El Tardeo" />
            </div>

            <div>
              <label style={label}>Ciudad *</label>
              {esClaim ? (
                <input style={{ ...input, background: "#FEF9F0", color: "#78716C" }} readOnly value={form.ciudad} />
              ) : (
                <select style={input} required value={form.ciudad} onChange={e => set("ciudad", e.target.value)}>
                  <option value="" disabled>Selecciona ciudad</option>
                  {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            {!esClaim && (
              <div>
                <label style={label}>Tipo de local</label>
                <select style={input} value={form.tipo} onChange={e => set("tipo", e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={label}>Dirección</label>
              <input style={input} value={form.direccion} onChange={e => set("direccion", e.target.value)} placeholder="Calle Mayor 12" />
            </div>

            <div>
              <label style={label}>Horario</label>
              <input style={input} value={form.horario} onChange={e => set("horario", e.target.value)} placeholder="Lu-Vi 16:00-21:00, Sa-Do 12:00-22:00" />
            </div>

            <div>
              <label style={label}>Teléfono</label>
              <input style={input} type="tel" value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="+34 600 000 000" />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input type="checkbox" id="terraza" checked={form.terraza} onChange={e => set("terraza", e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#FB923C", cursor: "pointer" }} />
              <label htmlFor="terraza" style={{ fontSize: "0.95rem", color: "#1C1917", cursor: "pointer" }}>☀️ Tiene terraza</label>
            </div>
          </div>

          {/* Redes sociales */}
          <div style={{ background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1C1917", marginBottom: "0.25rem" }}>Redes sociales y web</p>

            <div>
              <label style={label}>Instagram</label>
              <input style={input} value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="milocal (sin @)" />
            </div>

            <div>
              <label style={label}>TikTok</label>
              <input style={input} value={form.tiktok} onChange={e => set("tiktok", e.target.value)} placeholder="milocal (sin @)" />
            </div>

            <div>
              <label style={label}>Web</label>
              <input style={input} type="url" value={form.web} onChange={e => set("web", e.target.value)} placeholder="https://milocal.com" />
            </div>

            <div>
              <label style={label}>Cuéntanos algo (opcional)</label>
              <textarea style={{ ...input, minHeight: "90px", resize: "vertical" }}
                value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
                placeholder="Ambiente, especialidad, lo que os hace especiales..." />
            </div>
          </div>

          {/* Contacto */}
          <div style={{ background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1C1917", marginBottom: "0.25rem" }}>Tu contacto</p>

            <div>
              <label style={label}>Tu nombre</label>
              <input style={input} value={form.contacto_nombre} onChange={e => set("contacto_nombre", e.target.value)} placeholder="María García" />
            </div>

            <div>
              <label style={label}>Email de contacto *</label>
              <input style={input} type="email" required value={form.contacto_email} onChange={e => set("contacto_email", e.target.value)} placeholder="tu@email.com" />
            </div>
          </div>

          <button type="submit" disabled={status === "loading"} style={{
            padding: "1rem", borderRadius: "0.875rem",
            background: "linear-gradient(135deg, #FB923C, #F59E0B)",
            color: "white", fontWeight: 800, fontSize: "1rem",
            border: "none", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
            opacity: status === "loading" ? 0.7 : 1,
          }}>
            {status === "loading" ? "Enviando..." : esClaim ? "Reclamar esta ficha →" : "Apuntar mi local →"}
          </button>

          {status === "error" && (
            <p style={{ color: "#EF4444", fontSize: "0.85rem", textAlign: "center" }}>
              Algo falló. Inténtalo de nuevo.
            </p>
          )}

          <p style={{ color: "#A8A29E", fontSize: "0.75rem", textAlign: "center" }}>
            Es gratis. Revisamos cada solicitud antes de publicarla.
          </p>
        </form>
      </div>
    </main>
  );
}

export default function Unete() {
  return (
    <Suspense>
      <UneteForm />
    </Suspense>
  );
}
