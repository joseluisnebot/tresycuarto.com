"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Suscriptor = { email: string; ciudad: string; fecha: string; status: string };
type Visita = { dimensions: { date: string }; sum: { pageViews: number }; uniq: { uniques: number } };
type Calidad = { ciudad: string; total: number; con_dir: number; con_ig: number; con_web: number; con_tel: number };
type EventoGeo = { id: number; nombre: string; ciudad: string; fecha: string; hora_inicio?: string; direccion?: string; tipo: string; descripcion: string; radio_m?: number; dias_previos_envio?: number; estado: string };
type EmailPersonal = { id: string; nombre: string; ciudad: string; tipo: string; email_personal: string; web: string | null; instagram: string | null; slug: string | null; rating: number | null };

type Stats = {
  suscriptores: number;
  suscriptoresEstaSemana: number;
  listaSuscriptores: Suscriptor[];
  totalLocales: number;
  totalSolicitudes: number;
  localStats: { ciudad: string; total: number }[];
  solicitudes: Record<string, string | number | boolean | null>[];
  visitas: Visita[];
  visitasEspana: Visita[];
  visitantesEspanaSemana: number;
  conversion: string | null;
  calidad: Calidad[];
  geocoder: { total: number; con_dir: number; pendientes: number };
  b2b: { total: number; verificados: number; esta_semana: number };
  b2bLista: { email: string; slug: string; plan: string; verified: number; created_at: string; nombre: string; ciudad: string; tipo: string }[];
  eventosPendientes: EventoGeo[];
  emailsPersonales: EmailPersonal[];
};

const card: React.CSSProperties = {
  background: "white", borderRadius: "1.25rem",
  border: "1px solid #F5E6D3", padding: "1.5rem",
};

function Pct({ val, total }: { val: number; total: number }) {
  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
  const color = pct >= 70 ? "#059669" : pct >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div style={{ flex: 1, height: "6px", borderRadius: "999px", background: "#F5E6D3" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: color }} />
      </div>
      <span style={{ fontSize: "0.7rem", color, fontWeight: 700, minWidth: "30px" }}>{pct}%</span>
    </div>
  );
}

export default function Dashboard() {
  const [pass, setPass] = useState("");
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accionando, setAccionando] = useState<number | null>(null);
  const [accionandoEvento, setAccionandoEvento] = useState<number | null>(null);
  const [accionandoEmail, setAccionandoEmail] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const tokenRef = useRef("");

  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/stats?token=${encodeURIComponent(tokenRef.current)}`);
      if (res.ok) { setStats(await res.json()); setLastUpdate(new Date()); }
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  async function accionarEvento(id: number, accion: "aprobar" | "rechazar") {
    setAccionandoEvento(id);
    await fetch(`/api/admin/evento?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion }),
    });
    await refresh();
    setAccionandoEvento(null);
  }

  async function gestionarEmailPersonal(localId: string, accion: "aprobar" | "descartar") {
    setAccionandoEmail(localId);
    await fetch(`/api/admin/email-personal?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ local_id: localId, accion }),
    });
    await refresh();
    setAccionandoEmail(null);
  }

  async function accionarSolicitud(id: number, accion: "aceptar" | "descartar") {
    setAccionando(id);
    await fetch(`/api/admin/solicitud?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion }),
    });
    await refresh();
    setAccionando(null);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/stats?token=${encodeURIComponent(pass)}`);
    if (!res.ok) { setError("Contraseña incorrecta"); setLoading(false); return; }
    setStats(await res.json());
    setToken(pass);
    setLoading(false);
  }

  async function refresh() {
    const res = await fetch(`/api/admin/stats?token=${encodeURIComponent(token)}`);
    if (res.ok) { setStats(await res.json()); setLastUpdate(new Date()); }
  }

  if (!stats) return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, width: "100%", maxWidth: "360px" }}>
        <Link href="/" style={{ textDecoration: "none", fontSize: "1.2rem", fontWeight: 800, color: "#1C1917", display: "block", marginBottom: "1.5rem" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto <span style={{ fontSize: "0.8rem", color: "#78716C", fontWeight: 400 }}>· admin</span>
        </Link>
        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            type="password" placeholder="Contraseña" value={pass}
            onChange={e => setPass(e.target.value)} required
            style={{ padding: "0.85rem 1rem", borderRadius: "0.75rem", border: "1.5px solid #F5E6D3", fontSize: "1rem", outline: "none" }}
          />
          <button type="submit" disabled={loading} style={{
            padding: "0.85rem", borderRadius: "0.75rem", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 800,
          }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          {error && <p style={{ color: "#EF4444", fontSize: "0.85rem", textAlign: "center" }}>{error}</p>}
        </form>
      </div>
    </main>
  );

  const maxPV = stats.visitas.length > 0 ? Math.max(...stats.visitas.map(v => v.sum.pageViews)) : 1;
  const maxES = stats.visitasEspana.length > 0 ? Math.max(...stats.visitasEspana.map(v => v.uniq.uniques)) : 1;

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3",
        background: "rgba(255,248,239,0.95)", position: "sticky", top: 0,
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.1rem", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto <span style={{ fontSize: "0.75rem", color: "#78716C", fontWeight: 400 }}>· admin</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {lastUpdate && <span style={{ fontSize: "0.72rem", color: "#A8A29E" }}>Actualizado {lastUpdate.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · auto 30s</span>}
          <button onClick={refresh} style={{ background: "#FEF0DC", border: "none", borderRadius: "999px", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#FB923C" }}>
            Actualizar
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Suscriptores", value: stats.suscriptores, sub: `+${stats.suscriptoresEstaSemana} esta semana`, color: "#FB923C", bg: "#FEF0DC" },
            { label: "Locales en DB", value: stats.totalLocales.toLocaleString("es"), sub: `${stats.geocoder.con_dir.toLocaleString("es")} con dirección`, color: "#7C3AED", bg: "#EDE9FE" },
            { label: "Visitas ES / semana", value: stats.visitantesEspanaSemana.toLocaleString("es"), sub: "visitantes únicos reales", color: "#0EA5E9", bg: "#E0F2FE" },
            { label: "Conversión", value: stats.conversion ? `${stats.conversion}%` : "—", sub: "visitas ES → suscriptor", color: "#059669", bg: "#D1FAE5" },
            { label: "Solicitudes", value: stats.totalSolicitudes, sub: "pendientes de revisión", color: "#F59E0B", bg: "#FEF3C7" },
            { label: "Locales B2B", value: stats.b2b?.total ?? 0, sub: `+${stats.b2b?.esta_semana ?? 0} esta semana`, color: "#E1306C", bg: "#FCE7F3" },
            { label: "Eventos pendientes", value: stats.eventosPendientes?.length ?? 0, sub: "esperan aprobación", color: "#7C3AED", bg: "#EDE9FE" },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.78rem", color: "#78716C", marginTop: "0.2rem" }}>{s.label}</div>
              <div style={{ fontSize: "0.7rem", color: "#A8A29E", marginTop: "0.2rem" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Gráficas de visitas */}
        {stats.visitas.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Total */}
            <div style={card}>
              <p style={{ fontWeight: 700, marginBottom: "1rem", color: "#1C1917", fontSize: "0.9rem" }}>Páginas vistas (total)</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem", height: "70px" }}>
                {stats.visitas.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "100%", borderRadius: "0.3rem 0.3rem 0 0", background: "linear-gradient(180deg,#FB923C,#F59E0B)", height: `${Math.max(3, (v.sum.pageViews / maxPV) * 55)}px` }} title={`${v.sum.pageViews.toLocaleString("es")} pv`} />
                    <span style={{ fontSize: "0.55rem", color: "#A8A29E" }}>{v.dimensions.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* España real */}
            <div style={card}>
              <p style={{ fontWeight: 700, marginBottom: "1rem", color: "#1C1917", fontSize: "0.9rem" }}>Visitantes únicos 🇪🇸</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem", height: "70px" }}>
                {stats.visitasEspana.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.55rem", color: "#A8A29E" }}>{v.uniq.uniques}</span>
                    <div style={{ width: "100%", borderRadius: "0.3rem 0.3rem 0 0", background: "linear-gradient(180deg,#0EA5E9,#38BDF8)", height: `${Math.max(3, (v.uniq.uniques / maxES) * 50)}px` }} />
                    <span style={{ fontSize: "0.55rem", color: "#A8A29E" }}>{v.dimensions.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Geocoder progress */}
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: "1rem", color: "#1C1917" }}>Geocoder — progreso</p>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <Pct val={stats.geocoder.con_dir} total={stats.geocoder.total} />
            </div>
            <span style={{ fontSize: "0.82rem", color: "#78716C", whiteSpace: "nowrap" }}>
              {stats.geocoder.con_dir.toLocaleString("es")} / {stats.geocoder.total.toLocaleString("es")} con dirección
            </span>
            {stats.geocoder.pendientes > 0 && (
              <span style={{ fontSize: "0.75rem", background: "#FEF3C7", color: "#F59E0B", borderRadius: "999px", padding: "0.2rem 0.6rem", fontWeight: 600 }}>
                {stats.geocoder.pendientes.toLocaleString("es")} pendientes
              </span>
            )}
            {stats.geocoder.pendientes === 0 && (
              <span style={{ fontSize: "0.75rem", background: "#D1FAE5", color: "#059669", borderRadius: "999px", padding: "0.2rem 0.6rem", fontWeight: 600 }}>
                ✓ Completado
              </span>
            )}
          </div>
        </div>

        {/* Calidad de la DB */}
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: "1rem", color: "#1C1917" }}>Calidad de la base de datos</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F5E6D3", color: "#A8A29E", textAlign: "left" }}>
                  <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>Ciudad</th>
                  <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>Total</th>
                  <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600, minWidth: "120px" }}>Dirección</th>
                  <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600, minWidth: "120px" }}>Instagram</th>
                  <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600, minWidth: "120px" }}>Web</th>
                  <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600, minWidth: "120px" }}>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {stats.calidad.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #FFF0E0" }}>
                    <td style={{ padding: "0.5rem", fontWeight: 600, color: "#1C1917" }}>{c.ciudad}</td>
                    <td style={{ padding: "0.5rem", color: "#78716C" }}>{c.total.toLocaleString("es")}</td>
                    <td style={{ padding: "0.5rem" }}><Pct val={c.con_dir} total={c.total} /></td>
                    <td style={{ padding: "0.5rem" }}><Pct val={c.con_ig} total={c.total} /></td>
                    <td style={{ padding: "0.5rem" }}><Pct val={c.con_web} total={c.total} /></td>
                    <td style={{ padding: "0.5rem" }}><Pct val={c.con_tel} total={c.total} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Locales por ciudad */}
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: "1rem", color: "#1C1917" }}>Locales por ciudad</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {stats.localStats.map(c => (
              <a key={c.ciudad} href={`/locales?ciudad=${encodeURIComponent(c.ciudad)}`} target="_blank" rel="noreferrer"
                style={{ padding: "0.35rem 0.9rem", borderRadius: "999px", background: "#EDE9FE", color: "#7C3AED", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none" }}>
                {c.ciudad} <span style={{ opacity: 0.7 }}>{c.total.toLocaleString("es")}</span>
              </a>
            ))}
          </div>
        </div>

        {/* B2B — Locales registrados */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <p style={{ fontWeight: 700, color: "#1C1917", margin: 0 }}>
              Locales B2B{" "}
              <span style={{ color: "#A8A29E", fontWeight: 400, fontSize: "0.85rem" }}>({stats.b2b?.total ?? 0} total)</span>
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", background: "#D1FAE5", color: "#059669", borderRadius: "999px", padding: "0.2rem 0.6rem", fontWeight: 600 }}>
                {stats.b2b?.verificados ?? 0} verificados
              </span>
              <span style={{ fontSize: "0.75rem", background: "#FEF3C7", color: "#F59E0B", borderRadius: "999px", padding: "0.2rem 0.6rem", fontWeight: 600 }}>
                {(stats.b2b?.total ?? 0) - (stats.b2b?.verificados ?? 0)} sin verificar
              </span>
            </div>
          </div>
          {!stats.b2bLista?.length
            ? <p style={{ color: "#A8A29E", fontSize: "0.85rem" }}>Ningún local registrado aún</p>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F5E6D3", color: "#A8A29E", textAlign: "left" }}>
                    <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>Local</th>
                    <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>Email</th>
                    <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>Bio</th>
                    <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.b2bLista.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #FFF0E0" }}>
                      <td style={{ padding: "0.5rem" }}>
                        <span style={{ fontWeight: 600, color: "#1C1917" }}>{r.nombre}</span>
                        <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: "#A8A29E" }}>{r.ciudad}</span>
                      </td>
                      <td style={{ padding: "0.5rem", color: "#78716C" }}>{r.email}</td>
                      <td style={{ padding: "0.5rem" }}>
                        {r.slug && (
                          <a href={`/l/${r.slug}`} target="_blank" rel="noreferrer" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 600, fontSize: "0.78rem" }}>
                            /l/{r.slug}
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {r.verified
                          ? <span style={{ background: "#D1FAE5", color: "#059669", borderRadius: "999px", padding: "0.15rem 0.5rem", fontWeight: 600, fontSize: "0.72rem" }}>✓ Verificado</span>
                          : <span style={{ background: "#FEF3C7", color: "#F59E0B", borderRadius: "999px", padding: "0.15rem 0.5rem", fontWeight: 600, fontSize: "0.72rem" }}>Pendiente</span>
                        }
                      </td>
                      <td style={{ padding: "0.5rem", color: "#A8A29E" }}>{r.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        {/* Suscriptores */}
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: "1rem", color: "#1C1917" }}>
            Últimos suscriptores{" "}
            <span style={{ color: "#A8A29E", fontWeight: 400, fontSize: "0.85rem" }}>({stats.suscriptores} total)</span>
          </p>
          {stats.listaSuscriptores.length === 0
            ? <p style={{ color: "#A8A29E", fontSize: "0.85rem" }}>Ninguno aún</p>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F5E6D3", textAlign: "left", color: "#A8A29E" }}>
                    <th style={{ paddingBottom: "0.5rem", fontWeight: 600 }}>Email</th>
                    <th style={{ paddingBottom: "0.5rem", fontWeight: 600 }}>Ciudad</th>
                    <th style={{ paddingBottom: "0.5rem", fontWeight: 600 }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.listaSuscriptores.map((s, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #FFF0E0" }}>
                      <td style={{ padding: "0.5rem 0", color: "#1C1917" }}>{s.email}</td>
                      <td style={{ padding: "0.5rem 0" }}>
                        {s.ciudad && <span style={{ background: "#FEF0DC", color: "#FB923C", borderRadius: "999px", padding: "0.15rem 0.6rem", fontWeight: 600 }}>{s.ciudad}</span>}
                      </td>
                      <td style={{ padding: "0.5rem 0", color: "#A8A29E" }}>{s.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        {/* Eventos pendientes de aprobación */}
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: "1rem", color: "#1C1917" }}>
            Eventos pendientes{" "}
            {(!stats.eventosPendientes?.length) && <span style={{ color: "#A8A29E", fontWeight: 400 }}>— ninguno pendiente</span>}
          </p>
          {(stats.eventosPendientes || []).map((ev) => {
            const fecha = new Date(ev.fecha + "T12:00:00");
            const fechaEs = fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            const diasPrevios = ev.dias_previos_envio ?? 2;
            const fechaEnvio = new Date(fecha);
            fechaEnvio.setDate(fechaEnvio.getDate() - diasPrevios);
            const fechaEnvioEs = fechaEnvio.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
            const tipoIcon: Record<string, string> = { procesion: "⛪", feria: "🎡", concierto: "🎵", música: "🎵", festival: "🎪", deporte: "⚽", escena: "🎭", evento: "📅" };
            const icon = tipoIcon[ev.tipo] || "📅";
            return (
              <div key={ev.id} style={{ padding: "1rem", borderRadius: "0.875rem", background: "#F5F3FF", border: "1px solid #DDD6FE", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.95rem" }}>{icon} {ev.nombre}</span>
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.72rem", color: "#7C3AED", background: "#EDE9FE", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>{ev.ciudad}</span>
                    <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: "#78716C", background: "#F5F3FF", border: "1px solid #DDD6FE", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>{ev.tipo}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.6rem", fontSize: "0.82rem", color: "#57534E" }}>
                  <span>📅 {fechaEs}</span>
                  {ev.hora_inicio && <span>🕐 {ev.hora_inicio}</span>}
                  {ev.direccion && <span>📍 {ev.direccion}</span>}
                  {ev.radio_m && <span>📡 {ev.radio_m}m de radio</span>}
                  <span style={{ color: "#A78BFA" }}>✉️ Newsletter el {fechaEnvioEs}</span>
                </div>
                {ev.descripcion && (
                  <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#78716C", fontStyle: "italic", lineHeight: 1.5 }}>&ldquo;{ev.descripcion}&rdquo;</p>
                )}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button onClick={() => accionarEvento(ev.id, "aprobar")} disabled={accionandoEvento === ev.id}
                    style={{ padding: "0.4rem 1rem", borderRadius: "0.6rem", border: "none", cursor: "pointer", background: "#D1FAE5", color: "#059669", fontWeight: 700, fontSize: "0.8rem" }}>
                    {accionandoEvento === ev.id ? "..." : "✓ Aprobar newsletter"}
                  </button>
                  <button onClick={() => accionarEvento(ev.id, "rechazar")} disabled={accionandoEvento === ev.id}
                    style={{ padding: "0.4rem 1rem", borderRadius: "0.6rem", border: "none", cursor: "pointer", background: "#FEE2E2", color: "#DC2626", fontWeight: 700, fontSize: "0.8rem" }}>
                    {accionandoEvento === ev.id ? "..." : "✕ Rechazar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Emails personales pendientes de revisión */}
        {(stats.emailsPersonales?.length > 0) && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <p style={{ fontWeight: 700, color: "#1C1917", margin: 0 }}>
                📬 Emails dudosos — revisar manualmente
                <span style={{ marginLeft: "0.5rem", fontSize: "0.78rem", color: "#78716C", fontWeight: 400 }}>({stats.emailsPersonales.length} pendientes)</span>
              </p>
              <span style={{ fontSize: "0.72rem", color: "#78716C", background: "#FEF3C7", padding: "0.25rem 0.75rem", borderRadius: "999px" }}>
                ✓ Aprobar → pasa a outreach automático · ✕ Descartar → no contactar
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {stats.emailsPersonales.map((ep) => (
                <div key={ep.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "0.875rem", background: "#FFFBF5", border: "1px solid #F5E6D3", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <span style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.9rem" }}>{ep.nombre}</span>
                    <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: "#FB923C", background: "#FEF0DC", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>{ep.ciudad}</span>
                  </div>
                  <a href={`mailto:${ep.email_personal}`} style={{ color: "#7C3AED", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600 }}>
                    ✉️ {ep.email_personal}
                  </a>
                  {ep.web && <a href={ep.web} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "#0EA5E9", textDecoration: "none" }}>🌐 web</a>}
                  {ep.instagram && <a href={`https://instagram.com/${ep.instagram}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "#E1306C", textDecoration: "none" }}>📸 @{ep.instagram}</a>}
                  <div style={{ display: "flex", gap: "0.4rem", marginLeft: "auto" }}>
                    <button onClick={() => gestionarEmailPersonal(ep.id, "aprobar")} disabled={accionandoEmail === ep.id}
                      style={{ padding: "0.35rem 0.85rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", background: "#D1FAE5", color: "#059669", fontWeight: 700, fontSize: "0.78rem" }}>
                      {accionandoEmail === ep.id ? "..." : "✓ Aprobar"}
                    </button>
                    <button onClick={() => gestionarEmailPersonal(ep.id, "descartar")} disabled={accionandoEmail === ep.id}
                      style={{ padding: "0.35rem 0.85rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", background: "#FEE2E2", color: "#DC2626", fontWeight: 700, fontSize: "0.78rem" }}>
                      {accionandoEmail === ep.id ? "..." : "✕ Descartar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solicitudes */}
        <div style={card}>
          <p style={{ fontWeight: 700, marginBottom: "1rem", color: "#1C1917" }}>
            Solicitudes de locales {stats.solicitudes.length === 0 && <span style={{ color: "#A8A29E", fontWeight: 400 }}>— ninguna pendiente</span>}
          </p>
          {stats.solicitudes.map((s, i) => (
            <div key={i} style={{ padding: "1rem", borderRadius: "0.875rem", background: "#FFFBF5", border: "1px solid #F5E6D3", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#1C1917" }}>{String(s.nombre)}</span>
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#FB923C", background: "#FEF0DC", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>{String(s.ciudad)}</span>
                  {s.terraza ? <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", color: "#059669", background: "#D1FAE5", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>☀️ Terraza</span> : null}
                </div>
                <span style={{ fontSize: "0.75rem", color: "#A8A29E" }}>{String(s.creado_en || "").slice(0, 10)}</span>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "#78716C", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                {s.direccion && <span>📍 {String(s.direccion)}</span>}
                {s.instagram && <span>📸 @{String(s.instagram)}</span>}
                {s.web && <span>🌐 {String(s.web)}</span>}
                {s.telefono && <span>📞 {String(s.telefono)}</span>}
                {s.horario && <span>🕒 {String(s.horario)}</span>}
                {s.contacto_email && <a href={`mailto:${s.contacto_email}`} style={{ color: "#FB923C", textDecoration: "none" }}>✉️ {String(s.contacto_email)}</a>}
              </div>
              {s.descripcion && <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "#78716C", fontStyle: "italic" }}>&ldquo;{String(s.descripcion)}&rdquo;</p>}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button onClick={() => accionarSolicitud(Number(s.id), "aceptar")} disabled={accionando === Number(s.id)}
                  style={{ padding: "0.4rem 1rem", borderRadius: "0.6rem", border: "none", cursor: "pointer", background: "#D1FAE5", color: "#059669", fontWeight: 700, fontSize: "0.8rem" }}>
                  {accionando === Number(s.id) ? "..." : "✓ Aceptar"}
                </button>
                <button onClick={() => accionarSolicitud(Number(s.id), "descartar")} disabled={accionando === Number(s.id)}
                  style={{ padding: "0.4rem 1rem", borderRadius: "0.6rem", border: "none", cursor: "pointer", background: "#FEE2E2", color: "#DC2626", fontWeight: 700, fontSize: "0.8rem" }}>
                  {accionando === Number(s.id) ? "..." : "✕ Descartar"}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
