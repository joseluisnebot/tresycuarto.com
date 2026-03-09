"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTurnstile } from "../../components/useTurnstile";

const CIUDADES = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao", "Málaga", "Zaragoza", "Murcia"];
const TIPOS = ["bar", "cafe", "restaurante", "cocteleria", "cerveceria", "terraza", "pub", "copas", "otro"];

type LocalResult = {
  id: string;
  nombre: string;
  tipo: string;
  ciudad: string;
  direccion: string | null;
  claimed: number;
};

type Step = "buscar" | "nuevo_local" | "cuenta";

export default function LocalRegistro() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("buscar");

  // Búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [resultados, setResultados] = useState<LocalResult[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [localSeleccionado, setLocalSeleccionado] = useState<LocalResult | null>(null);

  // Nuevo local
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("bar");
  const [nuevaCiudad, setNuevaCiudad] = useState("");
  const [nuevaDireccion, setNuevaDireccion] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoWeb, setNuevoWeb] = useState("");
  const [nuevoInstagram, setNuevoInstagram] = useState("");

  // Cuenta
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const { containerRef, getToken } = useTurnstile();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (busqueda.length < 2) { setResultados([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const params = new URLSearchParams({ q: busqueda });
      if (ciudad) params.set("ciudad", ciudad);
      const res = await fetch(`/api/local/buscar?${params}`);
      const data = await res.json();
      setResultados(data.results || []);
      setBuscando(false);
    }, 300);
  }, [busqueda, ciudad]);

  function seleccionarLocal(r: LocalResult) {
    if (r.claimed) { setError("Este local ya tiene una cuenta"); return; }
    setLocalSeleccionado(r);
    setError("");
    setStep("cuenta");
  }

  function iniciarNuevo() {
    setNuevoNombre(busqueda);
    setNuevaCiudad(ciudad);
    setError("");
    setStep("nuevo_local");
  }

  function confirmarNuevo(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre || !nuevaCiudad) { setError("Nombre y ciudad son obligatorios"); return; }
    setLocalSeleccionado({ id: "__nuevo__", nombre: nuevoNombre, tipo: nuevoTipo, ciudad: nuevaCiudad, direccion: nuevaDireccion || null, claimed: 0 });
    setError("");
    setStep("cuenta");
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    if (!localSeleccionado) return;
    if (password !== password2) { setError("Las contraseñas no coinciden"); return; }
    setEnviando(true);
    setError("");

    const cf_token = await getToken();
    const esNuevo = localSeleccionado.id === "__nuevo__";
    const payload = esNuevo
      ? { action: "register_new", email, password, cf_token, nombre: nuevoNombre, tipo: nuevoTipo, ciudad: nuevaCiudad, direccion: nuevaDireccion || undefined, telefono: nuevoTelefono || undefined, web: nuevoWeb || undefined, instagram: nuevoInstagram || undefined }
      : { action: "register", email, password, cf_token, local_id: localSeleccionado.id };

    const res = await fetch("/api/local/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Error al registrar");
      setEnviando(false);
      return;
    }

    localStorage.setItem("local_token", data.token);
    localStorage.setItem("local_id", data.local_id);
    router.push("/local/dashboard");
  }

  const cardStyle: React.CSSProperties = {
    background: "white", borderRadius: "1.5rem", border: "1px solid #F5E6D3", padding: "2rem", width: "100%", maxWidth: "520px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.85rem 1rem", borderRadius: "0.75rem",
    border: "1.5px solid #F5E6D3", fontSize: "1rem", outline: "none", fontFamily: "inherit",
  };

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem" }}>

      <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.2rem", color: "#1C1917", marginBottom: "1.5rem" }}>
        tres<span style={{ color: "#FB923C" }}>y</span>cuarto
      </Link>

      {/* STEP: BUSCAR */}
      {step === "buscar" && (
        <div style={cardStyle}>
          <h1 style={{ fontWeight: 800, fontSize: "1.3rem", color: "#1C1917", marginBottom: "0.35rem" }}>Busca tu local</h1>
          <p style={{ fontSize: "0.85rem", color: "#78716C", marginBottom: "1.5rem" }}>
            Escribe el nombre de tu bar, cafetería o local de ocio.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <input
              type="text" placeholder="Ej: Bar El Rincón, Cafetería Sol..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={inputStyle} autoFocus
            />
            <select value={ciudad} onChange={e => setCiudad(e.target.value)} style={{ ...inputStyle, color: ciudad ? "#1C1917" : "#A8A29E" }}>
              <option value="">Todas las ciudades</option>
              {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {buscando && <p style={{ fontSize: "0.82rem", color: "#A8A29E", marginTop: "1rem" }}>Buscando...</p>}

          {resultados.length > 0 && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {resultados.map(r => (
                <button key={r.id} onClick={() => seleccionarLocal(r)} style={{
                  width: "100%", textAlign: "left", padding: "0.85rem 1rem", borderRadius: "0.875rem",
                  border: "1.5px solid", cursor: r.claimed ? "not-allowed" : "pointer",
                  borderColor: r.claimed ? "#F5E6D3" : "#FB923C",
                  background: r.claimed ? "#FAFAFA" : "white", opacity: r.claimed ? 0.6 : 1,
                }}>
                  <div style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.95rem" }}>{r.nombre}</div>
                  <div style={{ fontSize: "0.78rem", color: "#78716C", marginTop: "0.15rem" }}>
                    {r.tipo} · {r.ciudad}{r.direccion ? ` · ${r.direccion}` : ""}{r.claimed ? " · Ya reclamado" : ""}
                  </div>
                </button>
              ))}
            </div>
          )}

          {busqueda.length >= 2 && !buscando && (
            <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#FEF0DC", borderRadius: "0.875rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#78716C", marginBottom: "0.6rem" }}>
                {resultados.length === 0 ? `No encontramos "${busqueda}".` : "¿No ves tu local?"}
              </p>
              <button onClick={iniciarNuevo} style={{
                width: "100%", padding: "0.75rem", borderRadius: "0.75rem", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 700, fontSize: "0.9rem",
              }}>
                + Añadir mi local nuevo
              </button>
            </div>
          )}

          {error && <p style={{ color: "#EF4444", fontSize: "0.85rem", marginTop: "0.75rem" }}>{error}</p>}

          <p style={{ textAlign: "center", fontSize: "0.82rem", color: "#A8A29E", marginTop: "1.5rem" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/local/login" style={{ color: "#FB923C", fontWeight: 700, textDecoration: "none" }}>Entrar</Link>
          </p>
        </div>
      )}

      {/* STEP: DATOS NUEVO LOCAL */}
      {step === "nuevo_local" && (
        <div style={cardStyle}>
          <button onClick={() => { setStep("buscar"); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", fontSize: "0.85rem", marginBottom: "1rem", padding: 0 }}>
            ← Volver a la búsqueda
          </button>
          <h2 style={{ fontWeight: 800, fontSize: "1.2rem", color: "#1C1917", marginBottom: "0.35rem" }}>Datos de tu local</h2>
          <p style={{ fontSize: "0.85rem", color: "#78716C", marginBottom: "1.5rem" }}>Rellena lo que puedas. Siempre podrás editarlo después.</p>

          <form onSubmit={confirmarNuevo} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Nombre del local *</label>
              <input required style={inputStyle} value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Bar El Rincón" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Tipo *</label>
                <select required style={inputStyle} value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Ciudad *</label>
                <select required style={{ ...inputStyle, color: nuevaCiudad ? "#1C1917" : "#A8A29E" }} value={nuevaCiudad} onChange={e => setNuevaCiudad(e.target.value)}>
                  <option value="">Selecciona</option>
                  {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Dirección</label>
              <input style={inputStyle} value={nuevaDireccion} onChange={e => setNuevaDireccion(e.target.value)} placeholder="Calle Mayor 12" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Teléfono</label>
                <input type="tel" style={inputStyle} value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)} placeholder="612345678" />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Instagram</label>
                <input style={inputStyle} value={nuevoInstagram} onChange={e => setNuevoInstagram(e.target.value)} placeholder="@tulocal" />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Web</label>
              <input type="url" style={inputStyle} value={nuevoWeb} onChange={e => setNuevoWeb(e.target.value)} placeholder="https://..." />
            </div>
            {error && <p style={{ color: "#EF4444", fontSize: "0.85rem" }}>{error}</p>}
            <button type="submit" style={{
              padding: "0.9rem", borderRadius: "0.875rem", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 800, fontSize: "1rem",
            }}>
              Continuar →
            </button>
          </form>
        </div>
      )}

      {/* STEP: CREAR CUENTA */}
      {step === "cuenta" && localSeleccionado && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", padding: "0.85rem 1rem", background: "#FEF0DC", borderRadius: "0.875rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🍹</span>
            <div>
              <div style={{ fontWeight: 700, color: "#1C1917" }}>{localSeleccionado.nombre}</div>
              <div style={{ fontSize: "0.78rem", color: "#78716C" }}>{localSeleccionado.tipo} · {localSeleccionado.ciudad}</div>
            </div>
            <button onClick={() => { setStep(localSeleccionado.id === "__nuevo__" ? "nuevo_local" : "buscar"); setLocalSeleccionado(null); setError(""); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#A8A29E", fontSize: "1.1rem" }}>✕</button>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: "1.2rem", color: "#1C1917", marginBottom: "0.35rem" }}>Crea tu cuenta</h2>
          <p style={{ fontSize: "0.85rem", color: "#78716C", marginBottom: "1.5rem" }}>3 meses gratis · Sin tarjeta necesaria</p>

          <form onSubmit={handleRegistro} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Email de contacto</label>
              <input type="email" required placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Contraseña (mín. 8 caracteres)</label>
              <input type="password" required minLength={8} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Repite la contraseña</label>
              <input type="password" required minLength={8} placeholder="••••••••" value={password2} onChange={e => setPassword2(e.target.value)} style={inputStyle} />
            </div>
            {error && <p style={{ color: "#EF4444", fontSize: "0.85rem" }}>{error}</p>}
            <button type="submit" disabled={enviando} style={{
              padding: "0.9rem", borderRadius: "0.875rem", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 800, fontSize: "1rem",
            }}>
              {enviando ? "Registrando..." : "Crear cuenta →"}
            </button>
            <p style={{ fontSize: "0.75rem", color: "#A8A29E", textAlign: "center" }}>
              Al registrarte aceptas los{" "}
              <Link href="/privacidad" style={{ color: "#FB923C", textDecoration: "none" }}>términos de uso</Link>
            </p>
            <div ref={containerRef} />
          </form>
        </div>
      )}

    </main>
  );
}
