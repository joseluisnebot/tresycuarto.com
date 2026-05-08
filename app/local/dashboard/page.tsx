"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import QRCode from "qrcode";

type Local = {
  id: string;
  nombre: string;
  tipo: string;
  ciudad: string;
  direccion: string | null;
  telefono: string | null;
  web: string | null;
  instagram: string | null;
  horario: string | null;
  terraza: number | boolean | null;
  descripcion: string | null;
  foto_perfil: string | null;
  slug: string | null;
  lat: number | null;
  lon: number | null;
};

type LocalOption = { local_id: string; slug: string; nombre: string; ciudad: string };

type UserData = {
  email: string;
  plan: string;
  trial_inicio: string;
  plan_expires: string | null;
  slug: string;
  verified: boolean;
  local: Local;
  locales: LocalOption[];
  theme: string | null;
};

const COLORES: Record<string, { hex: string; nombre: string }> = {
  naranja: { hex: "#FB923C", nombre: "Naranja" },
  dorado:  { hex: "#F59E0B", nombre: "Dorado"  },
  verde:   { hex: "#10B981", nombre: "Verde"   },
  azul:    { hex: "#3B82F6", nombre: "Azul"    },
  morado:  { hex: "#8B5CF6", nombre: "Morado"  },
  rosa:    { hex: "#EC4899", nombre: "Rosa"    },
  rojo:    { hex: "#EF4444", nombre: "Rojo"    },
  oscuro:  { hex: "#292524", nombre: "Oscuro"  },
};

const TEMPLATES: { id: string; nombre: string; desc: string }[] = [
  { id: "bold",     nombre: "Bold",     desc: "Oscuro e impactante" },
  { id: "fresh",    nombre: "Fresh",    desc: "Claro y cercano"     },
  { id: "elegante", nombre: "Elegante", desc: "Premium y espaciado" },
];

function TemplatePreview({ id, color }: { id: string; color: string }) {
  const c = color;
  const gray = "#E2E8F0";
  const grayMid = "#CBD5E1";

  // BOLD — fondo oscuro, hero grande, tipografía dominante
  if (id === "bold") return (
    <svg viewBox="0 0 100 155" style={{ width: "100%", display: "block" }}>
      {/* fondo oscuro */}
      <rect width="100" height="155" fill="#0D1117" rx="4"/>
      {/* hero foto con overlay */}
      <rect x="0" y="0" width="100" height="70" fill="#1F2937" rx="4"/>
      <rect x="0" y="0" width="100" height="70" fill="url(#grad1)" rx="0"/>
      <defs><linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0D1117" stopOpacity="0.1"/><stop offset="100%" stopColor="#0D1117" stopOpacity="0.9"/></linearGradient></defs>
      {/* badge tipo */}
      <rect x="10" y="44" width="22" height="6" rx="3" fill={c}/>
      {/* nombre grande */}
      <rect x="10" y="53" width="65" height="8" rx="2" fill="white" opacity="0.9"/>
      <rect x="10" y="64" width="40" height="4" rx="2" fill="white" opacity="0.4"/>
      {/* separador */}
      <rect x="0" y="74" width="100" height="1" fill="#1F2937"/>
      {/* descripción */}
      <rect x="10" y="80" width="80" height="3" rx="1.5" fill="#334155"/>
      <rect x="10" y="86" width="60" height="3" rx="1.5" fill="#334155"/>
      {/* links oscuros */}
      <rect x="10" y="95" width="80" height="11" rx="3" fill={c}/>
      <rect x="18" y="98.5" width="30" height="4" rx="2" fill="white" opacity="0.9"/>
      <rect x="10" y="110" width="80" height="11" rx="3" fill="#1F2937"/>
      <rect x="18" y="113.5" width="35" height="4" rx="2" fill="#475569"/>
      <rect x="10" y="125" width="80" height="11" rx="3" fill="#1F2937"/>
      <rect x="18" y="128.5" width="25" height="4" rx="2" fill="#475569"/>
      {/* mapa oscuro */}
      <rect x="10" y="140" width="80" height="11" rx="3" fill="#161B22" opacity="0.8"/>
      <circle cx="50" cy="145.5" r="3" fill={c}/>
    </svg>
  );

  // FRESH — fondo claro, foto circular, tarjetas con sombra
  if (id === "fresh") return (
    <svg viewBox="0 0 100 155" style={{ width: "100%", display: "block" }}>
      <rect width="100" height="155" fill="white" rx="4"/>
      {/* header degradado */}
      <rect x="0" y="0" width="100" height="65" fill={c} opacity="0.08" rx="4"/>
      {/* foto circular */}
      <circle cx="50" cy="22" r="14" fill={gray}/>
      <circle cx="50" cy="22" r="14" fill="none" stroke={c} strokeWidth="2.5"/>
      {/* nombre */}
      <rect x="25" y="40" width="50" height="7" rx="3.5" fill="#1C1917" opacity="0.8"/>
      <rect x="30" y="51" width="40" height="4" rx="2" fill={gray}/>
      {/* badge horario */}
      <rect x="28" y="58" width="44" height="6" rx="3" fill="white"/>
      <rect x="28" y="58" width="44" height="6" rx="3" fill="none" stroke={gray} strokeWidth="1"/>
      <rect x="34" y="60.5" width="32" height="3" rx="1.5" fill={grayMid}/>
      {/* links con sombra visual */}
      <rect x="10" y="70" width="80" height="12" rx="6" fill="white"/>
      <rect x="10" y="70" width="80" height="12" rx="6" fill="none" stroke="#F1F5F9" strokeWidth="1.5"/>
      <rect x="22" y="74" width="28" height="4" rx="2" fill={grayMid}/>
      <rect x="10" y="86" width="80" height="12" rx="6" fill={c}/>
      <rect x="22" y="90" width="22" height="4" rx="2" fill="white" opacity="0.9"/>
      <rect x="10" y="102" width="80" height="12" rx="6" fill="white"/>
      <rect x="10" y="102" width="80" height="12" rx="6" fill="none" stroke="#F1F5F9" strokeWidth="1.5"/>
      <rect x="22" y="106" width="33" height="4" rx="2" fill={grayMid}/>
      {/* galería */}
      <rect x="10" y="120" width="24" height="20" rx="3" fill={gray}/>
      <rect x="38" y="120" width="24" height="20" rx="3" fill={gray}/>
      <rect x="66" y="120" width="24" height="20" rx="3" fill={gray}/>
      {/* mapa */}
      <rect x="10" y="144" width="80" height="8" rx="3" fill={gray} opacity="0.6"/>
      <circle cx="50" cy="148" r="2.5" fill={c}/>
    </svg>
  );

  // ELEGANTE — hero foto full, serif, mucho espacio
  return (
    <svg viewBox="0 0 100 155" style={{ width: "100%", display: "block" }}>
      <rect width="100" height="155" fill="white" rx="4"/>
      {/* hero full width */}
      <rect x="0" y="0" width="100" height="50" fill={gray} rx="4"/>
      <rect x="0" y="25" width="100" height="25" fill="black" opacity="0.35"/>
      {/* tipo pequeño */}
      <rect x="10" y="28" width="28" height="3" rx="1.5" fill="white" opacity="0.6"/>
      {/* nombre serif grande */}
      <rect x="10" y="34" width="62" height="8" rx="1" fill="white" opacity="0.95"/>
      {/* info rápida barra */}
      <rect x="0" y="50" width="100" height="14" fill="white"/>
      <rect x="0" y="63" width="100" height="1" fill="#F3F4F6"/>
      <rect x="8" y="54" width="30" height="3" rx="1.5" fill={grayMid}/>
      <rect x="8" y="59" width="20" height="2.5" rx="1.25" fill={gray}/>
      <rect x="52" y="54" width="25" height="3" rx="1.5" fill={grayMid}/>
      <rect x="52" y="59" width="18" height="2.5" rx="1.25" fill={gray}/>
      {/* CTA carta */}
      <rect x="10" y="68" width="80" height="13" rx="3" fill={c}/>
      <rect x="22" y="72" width="38" height="5" rx="2.5" fill="white" opacity="0.9"/>
      {/* descripción */}
      <rect x="10" y="88" width="80" height="3" rx="1.5" fill="#E5E7EB"/>
      <rect x="10" y="93" width="65" height="3" rx="1.5" fill="#E5E7EB"/>
      <rect x="10" y="98" width="72" height="3" rx="1.5" fill="#E5E7EB"/>
      {/* galería 2 col */}
      <rect x="10" y="107" width="37" height="28" rx="3" fill={gray}/>
      <rect x="53" y="107" width="37" height="28" rx="3" fill={gray}/>
      {/* contacto líneas */}
      <rect x="10" y="140" width="80" height="2" rx="1" fill="#F3F4F6"/>
      <rect x="10" y="146" width="55" height="3" rx="1.5" fill={gray}/>
      <rect x="10" y="151" width="40" height="3" rx="1.5" fill={gray}/>
    </svg>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.8rem 1rem", borderRadius: "0.75rem",
  border: "1.5px solid #F5E6D3", fontSize: "0.95rem", outline: "none", fontFamily: "inherit",
};
const cardStyle: React.CSSProperties = {
  background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", padding: "1.5rem",
};

const REDES_CONFIG: Record<string, { label: string; icon: string; placeholder: string }> = {
  instagram: { label: "Instagram", icon: "📸", placeholder: "@tulocal" },
  tiktok:    { label: "TikTok",    icon: "🎵", placeholder: "@tulocal" },
  facebook:  { label: "Facebook",  icon: "👥", placeholder: "nombre-de-pagina" },
  x:         { label: "X",         icon: "𝕏",  placeholder: "@tulocal" },
  youtube:   { label: "YouTube",   icon: "▶️", placeholder: "@tucanal" },
  whatsapp:  { label: "WhatsApp",  icon: "💬", placeholder: "612345678" },
};

// Helper: cabeceras con auth + local seleccionado
function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  return {
    Authorization: `Bearer ${localStorage.getItem("local_token") || ""}`,
    "X-Local-Id": localStorage.getItem("local_id") || "",
    ...extra,
  };
}

export default function LocalDashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Local>>({});
  const [slugForm, setSlugForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  const [mostrarSelectorLocal, setMostrarSelectorLocal] = useState(false);

  // Fotos
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const galeriaInputRef = useRef<HTMLInputElement>(null);

  // Carta / menú
  const [menuUrl, setMenuUrl] = useState<string | null>(null);
  const [subiendoMenu, setSubiendoMenu] = useState(false);
  const menuInputRef = useRef<HTMLInputElement>(null);

  // QR
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrMenuDataUrl, setQrMenuDataUrl] = useState("");

  // Eventos
  type Evento = { id: number; titulo: string; descripcion: string | null; fecha: string; hora_inicio: string | null; hora_fin: string | null; precio: string | null; enlace: string | null };
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: "", descripcion: "", fecha: "", hora_inicio: "", hora_fin: "", precio: "", enlace: "" });
  const [guardandoEvento, setGuardandoEvento] = useState(false);
  const [mostrarFormEvento, setMostrarFormEvento] = useState(false);
  const [editandoEvento, setEditandoEvento] = useState<Evento | null>(null);

  // Redes sociales
  type Red = { red: string; valor: string };
  const [redes, setRedes] = useState<Red[]>([]);
  const [nuevaRedTipo, setNuevaRedTipo] = useState("instagram");
  const [nuevaRedValor, setNuevaRedValor] = useState("");
  const [mostrarFormRed, setMostrarFormRed] = useState(false);
  const [guardandoRedes, setGuardandoRedes] = useState(false);
  const [redesGuardadas, setRedesGuardadas] = useState(false);

  // Tema / web propia
  const [temaColor, setTemaColor] = useState("naranja");
  const [temaTemplate, setTemaTemplate] = useState("completo");
  const [temaSections, setTemaSections] = useState<string[]>(["galeria", "eventos", "mapa"]);
  const [guardandoTema, setGuardandoTema] = useState(false);
  const [temaGuardado, setTemaGuardado] = useState(false);

  // Stats
  type StatDia = { dimensions: { date: string }; uniq: { uniques: number } };
  const [statsData, setStatsData] = useState<{ visitas: StatDia[]; totalVisitas: number; visitasHoy: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("local_token");
    if (!token) { router.push("/local/login"); return; }

    const headers = authHeaders();

    fetch("/api/local/perfil", { headers })
      .then(r => {
        if (r.status === 401) { localStorage.removeItem("local_token"); router.push("/local/login"); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setUserData(data);
        setForm({
          nombre: data.local?.nombre || "",
          descripcion: data.local?.descripcion || "",
          telefono: data.local?.telefono || "",
          web: data.local?.web || "",
          horario: data.local?.horario || "",
          terraza: data.local?.terraza,
          direccion: data.local?.direccion || "",
        });
        // Cargar redes sociales (con backward compat del campo instagram)
        let redesData: { red: string; valor: string }[] = [];
        if (data.local?.redes) { try { redesData = JSON.parse(data.local.redes); } catch {} }
        if (data.local?.instagram && !redesData.find((r: { red: string }) => r.red === "instagram")) {
          const h = data.local.instagram.replace(/^@/, "").replace(/.*instagram\.com\//, "").replace(/\/$/, "");
          if (h) redesData = [{ red: "instagram", valor: h }, ...redesData];
        }
        setRedes(redesData);
        setSlugForm(data.slug || "");
        if (data.theme) {
          try {
            const t = JSON.parse(data.theme);
            const ALIAS: Record<string, string> = { minimalista: "bold", completo: "fresh", restaurante: "elegante" };
            if (t.color) setTemaColor(t.color);
            if (t.template) setTemaTemplate(ALIAS[t.template] || t.template);
            if (t.sections) setTemaSections(t.sections);
          } catch {}
        }
        setFotoPerfil(data.local?.foto_perfil || null);
        setFotos(data.local?.fotos ? JSON.parse(data.local.fotos) : []);
        const mu = data.local?.menu_url || null;
        setMenuUrl(mu);
        setLoading(false);

        // Generar QR bio
        const bioUrl = `https://tresycuarto.com/${data.slug}`;
        QRCode.toDataURL(bioUrl, { width: 200, margin: 1, color: { dark: "#1C1917", light: "#FFF8EF" } })
          .then(setQrDataUrl).catch(() => {});

        // Generar QR carta si existe
        if (mu) {
          QRCode.toDataURL(mu, { width: 200, margin: 1, color: { dark: "#1C1917", light: "#FFF8EF" } })
            .then(setQrMenuDataUrl).catch(() => {});
        }
      })
      .catch(() => { router.push("/local/login"); });

    // Cargar eventos
    fetch("/api/local/eventos", { headers })
      .then(r => r.json()).then(d => setEventos(d.eventos || [])).catch(() => {});

    // Cargar stats
    fetch("/api/local/stats", { headers })
      .then(r => r.json()).then(setStatsData).catch(() => {});
  }, [router]);

  async function subirFoto(file: File, tipo: "perfil" | "galeria") {
    setSubiendoFoto(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: "image/webp" });
      const fd = new FormData();
      fd.append("file", compressed, `foto.webp`);
      fd.append("tipo", tipo);
      const res = await fetch("/api/local/fotos", { method: "POST", headers: authHeaders(), body: fd });
      const data = await res.json();
      if (res.ok) {
        if (tipo === "perfil") setFotoPerfil(data.url);
        else setFotos(f => [...f, data.url]);
      }
    } finally { setSubiendoFoto(false); }
  }

  async function eliminarFoto(url: string) {
    await fetch(`/api/local/fotos?url=${encodeURIComponent(url)}`, { method: "DELETE", headers: authHeaders() });
    if (url === fotoPerfil) setFotoPerfil(null);
    else setFotos(f => f.filter(x => x !== url));
  }

  async function subirMenu(file: File) {
    setSubiendoMenu(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/local/menu", { method: "POST", headers: authHeaders(), body: fd });
      const data = await res.json();
      if (res.ok) {
        setMenuUrl(data.url);
        QRCode.toDataURL(data.url, { width: 200, margin: 1, color: { dark: "#1C1917", light: "#FFF8EF" } })
          .then(setQrMenuDataUrl).catch(() => {});
      }
    } finally { setSubiendoMenu(false); }
  }

  async function eliminarMenu() {
    await fetch("/api/local/menu", { method: "DELETE", headers: authHeaders() });
    setMenuUrl(null);
    setQrMenuDataUrl("");
  }

  async function crearEvento(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoEvento(true);
    const res = await fetch("/api/local/eventos", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(nuevoEvento),
    });
    const data = await res.json();
    if (res.ok) {
      setEventos(ev => [...ev, { ...nuevoEvento, id: data.id, descripcion: nuevoEvento.descripcion || null, hora_inicio: nuevoEvento.hora_inicio || null, hora_fin: nuevoEvento.hora_fin || null, precio: nuevoEvento.precio || null, enlace: nuevoEvento.enlace || null }]);
      setNuevoEvento({ titulo: "", descripcion: "", fecha: "", hora_inicio: "", hora_fin: "", precio: "", enlace: "" });
      setMostrarFormEvento(false);
    }
    setGuardandoEvento(false);
  }

  async function guardarEdicionEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoEvento) return;
    setGuardandoEvento(true);
    const res = await fetch("/api/local/eventos", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(editandoEvento),
    });
    if (res.ok) {
      setEventos(ev => ev.map(x => x.id === editandoEvento.id ? editandoEvento : x));
      setEditandoEvento(null);
    }
    setGuardandoEvento(false);
  }

  async function eliminarEvento(id: number) {
    await fetch(`/api/local/eventos?id=${id}`, { method: "DELETE", headers: authHeaders() });
    setEventos(ev => ev.filter(e => e.id !== id));
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setGuardado(false);

    const res = await fetch("/api/local/perfil", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ...form, slug: slugForm }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Error al guardar"); setGuardando(false); return; }

    if (slugForm !== userData?.slug && userData) {
      setUserData({ ...userData, slug: slugForm });
    }
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  }

  async function guardarRedes() {
    setGuardandoRedes(true);
    const insta = redes.find(r => r.red === "instagram");
    await fetch("/api/local/perfil", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ redes: JSON.stringify(redes), instagram: insta?.valor || "" }),
    });
    setGuardandoRedes(false);
    setRedesGuardadas(true);
    setTimeout(() => setRedesGuardadas(false), 2500);
  }

  function agregarRed() {
    if (!nuevaRedValor.trim()) return;
    const valor = nuevaRedValor.trim().replace(/^@/, "");
    setRedes(r => r.find(x => x.red === nuevaRedTipo)
      ? r.map(x => x.red === nuevaRedTipo ? { ...x, valor } : x)
      : [...r, { red: nuevaRedTipo, valor }]
    );
    setNuevaRedValor("");
    setMostrarFormRed(false);
  }

  async function guardarTema() {
    setGuardandoTema(true);
    await fetch("/api/local/tema", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ color: temaColor, template: temaTemplate, sections: temaSections }),
    });
    setGuardandoTema(false);
    setTemaGuardado(true);
    setTimeout(() => setTemaGuardado(false), 3000);
  }

  function toggleSection(s: string) {
    setTemaSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function handleLogout() {
    localStorage.removeItem("local_token");
    localStorage.removeItem("local_id");
    router.push("/local/login");
  }

  function cambiarLocal(local: LocalOption) {
    localStorage.setItem("local_id", local.local_id);
    setMostrarSelectorLocal(false);
    setLoading(true);
    window.location.reload();
  }

  if (loading) {
    return (
      <main style={{ background: "#FFF8EF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#A8A29E" }}>Cargando...</p>
      </main>
    );
  }

  if (!userData) return null;

  const bioUrl = `https://tresycuarto.com/${userData.slug}`;
  const TRIAL_DAYS = 14;
  const trialExpires = userData.trial_inicio
    ? new Date(userData.trial_inicio).getTime() + TRIAL_DAYS * 86400000
    : Date.now();
  const trialDias = Math.max(0, Math.ceil((trialExpires - Date.now()) / 86400000));

  const planStatus: "pro" | "trial" | "free" = userData.plan === "pro"
    ? (userData.plan_expires && new Date(userData.plan_expires) < new Date() ? "free" : "pro")
    : (trialDias > 0 ? "trial" : "free");
  const isPro = planStatus === "pro" || planStatus === "trial";

  async function activarPlan(plan: "monthly" | "annual") {
    try {
      const res = await fetch("/api/local/checkout", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error: " + (data.error || JSON.stringify(data)));
      }
    } catch (err) {
      alert("Error de red: " + err);
    }
  }

  const tieneVariosLocales = userData.locales && userData.locales.length > 1;

  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3",
        background: "rgba(255,248,239,0.95)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.1rem", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.8rem", color: "#A8A29E" }}>{userData.email}</span>
          {tieneVariosLocales && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMostrarSelectorLocal(v => !v)} style={{
                background: "#FEF0DC", border: "1px solid #F5E6D3", borderRadius: "0.6rem",
                padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.8rem", color: "#FB923C", fontWeight: 700,
              }}>
                Cambiar local
              </button>
              {mostrarSelectorLocal && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 0.5rem)", background: "white",
                  border: "1px solid #F5E6D3", borderRadius: "0.875rem", padding: "0.5rem",
                  minWidth: "220px", zIndex: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}>
                  {userData.locales.map(l => (
                    <button key={l.local_id} onClick={() => cambiarLocal(l)} style={{
                      width: "100%", textAlign: "left", padding: "0.65rem 0.85rem", borderRadius: "0.6rem",
                      border: "none", background: l.local_id === localStorage.getItem("local_id") ? "#FEF0DC" : "none",
                      cursor: "pointer", display: "block",
                    }}>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1C1917" }}>{l.nombre || l.local_id}</div>
                      <div style={{ fontSize: "0.72rem", color: "#78716C" }}>{l.ciudad}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Link href="/local/add-local" style={{ background: "#FEF0DC", border: "1px solid #F5E6D3", borderRadius: "0.6rem", padding: "0.35rem 0.75rem", fontSize: "0.8rem", color: "#FB923C", fontWeight: 700, textDecoration: "none" }}>
            + Añadir local
          </Link>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid #F5E6D3", borderRadius: "0.6rem", padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.8rem", color: "#78716C" }}>
            Salir
          </button>
        </div>
      </nav>

      {/* Banner pago */}
      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pago") === "ok" && (
        <div style={{ background: "#D1FAE5", borderBottom: "1px solid #6EE7B7", padding: "0.75rem 1.5rem", textAlign: "center", fontSize: "0.85rem", color: "#065F46" }}>
          Pago realizado correctamente. Tu plan Pro ya está activo.
        </div>
      )}

      {/* Banner verificación */}
      {!userData.verified && (
        <div style={{ background: "#FEF3C7", borderBottom: "1px solid #FCD34D", padding: "0.75rem 1.5rem", textAlign: "center", fontSize: "0.85rem", color: "#92400E" }}>
          Confirma tu email para asegurar el acceso a tu cuenta.
          <span style={{ color: "#78716C" }}> Revisa tu bandeja de entrada en <strong>{userData.email}</strong>.</span>
        </div>
      )}

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Header local */}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg,#FB923C,#F59E0B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0 }}>
            🍹
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 800, fontSize: "1.2rem", color: "#1C1917" }}>{userData.local.nombre}</h1>
            <p style={{ fontSize: "0.82rem", color: "#78716C" }}>{userData.local.tipo} · {userData.local.ciudad}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            {planStatus === "pro" && (
              <span style={{ background: "#DBEAFE", color: "#1D4ED8", borderRadius: "999px", padding: "0.25rem 0.75rem", fontSize: "0.78rem", fontWeight: 700 }}>
                Pro ✓
              </span>
            )}
            {planStatus === "trial" && (
              <span style={{ background: "#D1FAE5", color: "#059669", borderRadius: "999px", padding: "0.25rem 0.75rem", fontSize: "0.78rem", fontWeight: 700 }}>
                Trial · {trialDias} días
              </span>
            )}
            {planStatus === "free" && (
              <span style={{ background: "#FEE2E2", color: "#DC2626", borderRadius: "999px", padding: "0.25rem 0.75rem", fontSize: "0.78rem", fontWeight: 700 }}>
                Trial caducado
              </span>
            )}
          </div>
        </div>

        {/* Card activar plan */}
        {planStatus === "free" && (
          <div style={{ ...cardStyle, border: "2px solid #FB923C" }}>
            <p style={{ fontWeight: 800, color: "#1C1917", fontSize: "1.05rem", marginBottom: "0.35rem" }}>Activa tu plan Pro</p>
            <p style={{ color: "#78716C", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Tu periodo de prueba ha terminado. Activa el plan Pro para seguir usando la galería de fotos, carta, eventos, QR de mesa y estadísticas.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={() => activarPlan("monthly")}
                style={{ flex: 1, minWidth: "140px", padding: "0.9rem 1rem", background: "white", border: "2px solid #FB923C", borderRadius: "0.875rem", cursor: "pointer", textAlign: "center" }}
              >
                <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "#1C1917" }}>9€</div>
                <div style={{ fontSize: "0.78rem", color: "#78716C" }}>al mes · sin compromiso</div>
              </button>
              <button
                onClick={() => activarPlan("annual")}
                style={{ flex: 1, minWidth: "140px", padding: "0.9rem 1rem", background: "linear-gradient(135deg,#FB923C,#F59E0B)", border: "none", borderRadius: "0.875rem", cursor: "pointer", textAlign: "center", position: "relative" }}
              >
                <div style={{ position: "absolute", top: "-10px", right: "10px", background: "#059669", color: "white", fontSize: "0.65rem", fontWeight: 700, borderRadius: "999px", padding: "0.15rem 0.5rem" }}>AHORRA 29€</div>
                <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "white" }}>79€</div>
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.85)" }}>al año · más popular</div>
              </button>
            </div>
            <p style={{ fontSize: "0.72rem", color: "#A8A29E", marginTop: "0.75rem" }}>
              Pago seguro con Stripe · Cancela cuando quieras · Tus datos se conservan siempre
            </p>
          </div>
        )}

        {/* Bio link */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.75rem" }}>Tu enlace de bio</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <a href={bioUrl} target="_blank" rel="noopener" style={{
              flex: 1, padding: "0.75rem 1rem", background: "#FEF0DC", borderRadius: "0.75rem",
              color: "#FB923C", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem",
              wordBreak: "break-all",
            }}>
              {bioUrl}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(bioUrl)}
              style={{ padding: "0.75rem 1rem", background: "#1C1917", color: "white", borderRadius: "0.75rem", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}
            >
              Copiar
            </button>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#A8A29E", marginTop: "0.6rem" }}>
            Ponlo en la bio de tu Instagram para que tus seguidores encuentren todo tu info.
          </p>
        </div>

        {/* Tu página web */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "1rem" }}>🌐 Tu página web</p>

          {/* URL subdominio */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <a
              href={`https://${userData.slug}.tresycuarto.com`} target="_blank" rel="noopener"
              style={{ flex: 1, padding: "0.75rem 1rem", background: "#FEF0DC", borderRadius: "0.75rem", color: "#FB923C", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem", wordBreak: "break-all" }}
            >
              {userData.slug}.tresycuarto.com
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(`https://${userData.slug}.tresycuarto.com`)}
              style={{ padding: "0.75rem 1rem", background: "#1C1917", color: "white", borderRadius: "0.75rem", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}
            >
              Copiar
            </button>
          </div>

          {/* Selector de plantilla */}
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>Plantilla</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {TEMPLATES.map(t => {
              const selected = temaTemplate === t.id;
              const primaryColor = COLORES[temaColor]?.hex || "#FB923C";
              return (
                <button
                  key={t.id} onClick={() => setTemaTemplate(t.id)}
                  style={{
                    padding: "0", borderRadius: "0.875rem", cursor: "pointer", textAlign: "center",
                    border: selected ? `2.5px solid ${primaryColor}` : "2px solid #F5E6D3",
                    background: "white", overflow: "hidden",
                    boxShadow: selected ? `0 4px 16px ${primaryColor}33` : "0 1px 4px rgba(0,0,0,0.05)",
                    transition: "all 0.15s", outline: "none",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  {/* Miniatura SVG */}
                  <div style={{ padding: "0.5rem 0.5rem 0", background: selected ? `${primaryColor}0D` : "#FAFAF9" }}>
                    <TemplatePreview id={t.id} color={primaryColor} />
                  </div>
                  {/* Etiqueta */}
                  <div style={{ padding: "0.5rem 0.25rem 0.6rem", borderTop: selected ? `1px solid ${primaryColor}33` : "1px solid #F5E6D3", background: selected ? `${primaryColor}0D` : "white" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.8rem", color: selected ? primaryColor : "#1C1917" }}>{t.nombre}</div>
                    <div style={{ fontSize: "0.67rem", color: "#A8A29E", marginTop: "0.1rem" }}>{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selector de color */}
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Color</p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {Object.entries(COLORES).map(([key, c]) => (
              <button
                key={key} onClick={() => setTemaColor(key)} title={c.nombre}
                style={{
                  width: "36px", height: "36px", borderRadius: "50%", background: c.hex, border: "none", cursor: "pointer",
                  outline: temaColor === key ? `3px solid ${c.hex}` : "3px solid transparent",
                  outlineOffset: "2px", transition: "outline 0.15s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </div>

          {/* Secciones visibles */}
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Secciones visibles</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.25rem" }}>
            {[
              { id: "galeria", label: "📸 Galería de fotos" },
              { id: "eventos", label: "📅 Próximos eventos" },
              { id: "mapa",    label: "📍 Mapa de ubicación" },
            ].map(s => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.5rem 0.75rem", borderRadius: "0.6rem", background: temaSections.includes(s.id) ? "#FEF0DC" : "#FAFAF9", border: "1px solid #F5E6D3" }}>
                <input type="checkbox" checked={temaSections.includes(s.id)} onChange={() => toggleSection(s.id)} style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: COLORES[temaColor]?.hex || "#FB923C" }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1C1917" }}>{s.label}</span>
              </label>
            ))}
          </div>

          <button onClick={guardarTema} disabled={guardandoTema} style={{
            width: "100%", padding: "0.9rem", borderRadius: "0.875rem", border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem", color: "white",
            background: temaGuardado ? "linear-gradient(135deg,#059669,#10B981)" : `linear-gradient(135deg,${COLORES[temaColor]?.hex || "#FB923C"},${COLORES[temaColor]?.hex || "#FB923C"}CC)`,
          }}>
            {guardandoTema ? "Guardando..." : temaGuardado ? "✓ Diseño guardado" : "Guardar diseño"}
          </button>
        </div>

        {/* Formulario editar perfil */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "1.25rem" }}>Editar perfil</p>
          <form onSubmit={handleGuardar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Nombre del local</label>
                <input style={inputStyle} value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Teléfono</label>
                <input style={inputStyle} type="tel" placeholder="612345678" value={form.telefono || ""} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>
                Dirección
                {userData.local?.lat && userData.local?.lon
                  ? <span style={{ marginLeft: "0.5rem", color: "#059669", fontSize: "0.72rem" }}>✓ Ubicación en mapa</span>
                  : form.direccion ? <span style={{ marginLeft: "0.5rem", color: "#F59E0B", fontSize: "0.72rem" }}>Se geocodificará al guardar</span> : null
                }
              </label>
              <input
                style={inputStyle}
                placeholder="Calle Ejemplo 12, piso 1"
                value={form.direccion || ""}
                onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Descripción</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical", minHeight: "90px" }}
                placeholder="Cuéntale a la gente qué hace especial a tu local..."
                value={form.descripcion || ""} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Web</label>
              <input style={inputStyle} type="url" placeholder="https://..." value={form.web || ""} onChange={e => setForm(f => ({ ...f, web: e.target.value }))} />
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>Horario</label>
              <input style={inputStyle} placeholder="Lun-Vie 08:00-22:00 · Sáb-Dom 10:00-24:00" value={form.horario || ""} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                type="checkbox" id="terraza"
                checked={!!form.terraza}
                onChange={e => setForm(f => ({ ...f, terraza: e.target.checked ? 1 : 0 }))}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="terraza" style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1C1917", cursor: "pointer" }}>
                ☀️ Tiene terraza exterior
              </label>
            </div>

            <div style={{ borderTop: "1px solid #F5E6D3", paddingTop: "1rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.3rem" }}>
                URL de tu página (tresycuarto.com/<strong>{slugForm || "tu-local"}</strong>)
              </label>
              <input
                style={inputStyle} placeholder="mi-local-madrid"
                value={slugForm}
                onChange={e => setSlugForm(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60))}
              />
            </div>

            {error && <p style={{ color: "#EF4444", fontSize: "0.85rem" }}>{error}</p>}

            <button type="submit" disabled={guardando} style={{
              padding: "0.9rem", borderRadius: "0.875rem", border: "none", cursor: "pointer",
              background: guardado ? "linear-gradient(135deg,#059669,#10B981)" : "linear-gradient(135deg,#FB923C,#F59E0B)",
              color: "white", fontWeight: 800, fontSize: "0.95rem",
            }}>
              {guardando ? "Guardando..." : guardado ? "✓ Guardado" : "Guardar cambios"}
            </button>
          </form>
        </div>

        {/* Redes sociales */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <p style={{ fontWeight: 700, color: "#1C1917", margin: 0 }}>Redes sociales</p>
            {!mostrarFormRed && (
              <button onClick={() => setMostrarFormRed(true)} style={{ padding: "0.35rem 0.85rem", background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", border: "none", borderRadius: "0.6rem", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                + Añadir red
              </button>
            )}
          </div>

          {mostrarFormRed && (
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <select
                value={nuevaRedTipo} onChange={e => { setNuevaRedTipo(e.target.value); setNuevaRedValor(""); }}
                style={{ ...inputStyle, width: "auto", flex: "0 0 auto" }}
              >
                {Object.entries(REDES_CONFIG).map(([key, rc]) => (
                  <option key={key} value={key}>{rc.icon} {rc.label}</option>
                ))}
              </select>
              <input
                style={{ ...inputStyle, flex: 1, minWidth: "140px" }}
                placeholder={REDES_CONFIG[nuevaRedTipo]?.placeholder || ""}
                value={nuevaRedValor}
                onChange={e => setNuevaRedValor(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), agregarRed())}
              />
              <button onClick={agregarRed} style={{ padding: "0.8rem 1rem", background: "#1C1917", color: "white", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                Añadir
              </button>
              <button onClick={() => { setMostrarFormRed(false); setNuevaRedValor(""); }} style={{ padding: "0.8rem 1rem", background: "none", border: "1px solid #F5E6D3", borderRadius: "0.75rem", cursor: "pointer", fontSize: "0.85rem", color: "#78716C" }}>
                Cancelar
              </button>
            </div>
          )}

          {redes.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#A8A29E" }}>Aún no has añadido ninguna red social.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {redes.map(r => {
                const cfg = REDES_CONFIG[r.red];
                return (
                  <div key={r.red} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.875rem", background: "#FAFAF9", borderRadius: "0.75rem", border: "1px solid #F5E6D3" }}>
                    <span style={{ fontSize: "1.1rem" }}>{cfg?.icon || "🔗"}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#78716C", flex: "0 0 80px" }}>{cfg?.label || r.red}</span>
                    <span style={{ fontSize: "0.9rem", color: "#1C1917", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.red === "whatsapp" ? r.valor : `@${r.valor}`}
                    </span>
                    <button onClick={() => setRedes(rs => rs.filter(x => x.red !== r.red))} style={{ background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: "0.4rem", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {redes.length > 0 && (
            <button onClick={guardarRedes} disabled={guardandoRedes} style={{
              padding: "0.75rem 1.5rem", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", color: "white",
              background: redesGuardadas ? "linear-gradient(135deg,#059669,#10B981)" : "linear-gradient(135deg,#FB923C,#F59E0B)",
            }}>
              {guardandoRedes ? "Guardando..." : redesGuardadas ? "✓ Guardado" : "Guardar redes"}
            </button>
          )}
        </div>

        {/* Galería de fotos */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "1rem" }}>📸 Fotos</p>

          {/* Foto de perfil */}
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", marginBottom: "0.5rem" }}>Foto de perfil</p>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            {fotoPerfil
              ? <div style={{ position: "relative" }}>
                  <img src={fotoPerfil} alt="perfil" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #F5E6D3" }} />
                  <button onClick={() => eliminarFoto(fotoPerfil)} style={{ position: "absolute", top: -6, right: -6, background: "#EF4444", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: "0.7rem", lineHeight: "20px", textAlign: "center" }}>✕</button>
                </div>
              : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#FEF0DC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem" }}>🍹</div>
            }
            <div>
              <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) subirFoto(e.target.files[0], "perfil"); }} />
              <button onClick={() => fotoInputRef.current?.click()} disabled={subiendoFoto} style={{ padding: "0.5rem 1rem", background: "#FEF0DC", color: "#FB923C", border: "none", borderRadius: "0.6rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                {subiendoFoto ? "Subiendo..." : "Cambiar foto"}
              </button>
              <p style={{ fontSize: "0.72rem", color: "#A8A29E", marginTop: "0.3rem" }}>JPG, PNG o WebP · Máx. 5MB</p>
            </div>
          </div>

          {/* Galería */}
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#78716C", marginBottom: "0.5rem" }}>
            Galería ({fotos.length}/6)
            {!isPro && <span style={{ marginLeft: "0.5rem", background: "#FEF3C7", color: "#92400E", borderRadius: "999px", padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700 }}>Pro</span>}
          </p>
          {isPro ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {fotos.map((url, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={url} alt={`foto ${i + 1}`} style={{ width: 80, height: 80, borderRadius: "0.75rem", objectFit: "cover", border: "1.5px solid #F5E6D3" }} />
                  <button onClick={() => eliminarFoto(url)} style={{ position: "absolute", top: -6, right: -6, background: "#EF4444", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: "0.7rem", lineHeight: "20px", textAlign: "center" }}>✕</button>
                </div>
              ))}
              {fotos.length < 6 && (
                <>
                  <input ref={galeriaInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) subirFoto(e.target.files[0], "galeria"); }} />
                  <button onClick={() => galeriaInputRef.current?.click()} disabled={subiendoFoto} style={{ width: 80, height: 80, borderRadius: "0.75rem", border: "2px dashed #F5E6D3", background: "none", cursor: "pointer", fontSize: "1.5rem", color: "#A8A29E" }}>+</button>
                </>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "0.82rem", color: "#A8A29E" }}>La galería de fotos está disponible en el plan Pro.</p>
          )}
        </div>

        {/* Carta / menú */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.5rem" }}>
            Carta
            {!isPro && <span style={{ marginLeft: "0.5rem", background: "#FEF3C7", color: "#92400E", borderRadius: "999px", padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700 }}>Pro</span>}
          </p>
          {isPro ? (
            <>
              <p style={{ fontSize: "0.82rem", color: "#78716C", marginBottom: "1rem" }}>Sube tu carta en PDF o como imagen. Aparecerá en tu página pública con un botón Ver carta.</p>
              <input ref={menuInputRef} type="file" accept="application/pdf,image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) subirMenu(e.target.files[0]); }} />
              {menuUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <a href={menuUrl} target="_blank" rel="noopener" style={{ flex: 1, padding: "0.75rem 1rem", background: "#FEF0DC", borderRadius: "0.75rem", color: "#FB923C", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", wordBreak: "break-all" }}>
                    {menuUrl.endsWith(".pdf") ? "Ver carta — PDF" : "Ver carta — imagen"}
                  </a>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => menuInputRef.current?.click()} disabled={subiendoMenu} style={{ padding: "0.6rem 1rem", background: "#FEF0DC", color: "#FB923C", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>Cambiar</button>
                    <button onClick={eliminarMenu} style={{ padding: "0.6rem 1rem", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>Borrar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => menuInputRef.current?.click()} disabled={subiendoMenu} style={{ padding: "0.75rem 1.25rem", background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", border: "none", borderRadius: "0.875rem", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
                  {subiendoMenu ? "Subiendo..." : "Subir carta"}
                </button>
              )}
              <p style={{ fontSize: "0.72rem", color: "#A8A29E", marginTop: "0.5rem" }}>PDF o imagen · Máx. 10MB</p>
            </>
          ) : (
            <p style={{ fontSize: "0.82rem", color: "#A8A29E" }}>La carta está disponible en el plan Pro.</p>
          )}
        </div>

        {/* QR codes */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "1rem" }}>📄 Códigos QR</p>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>

            {/* QR bio */}
            {qrDataUrl && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.05em" }}>Página bio</p>
                <img src={qrDataUrl} alt="QR bio" style={{ width: 110, height: 110, borderRadius: "0.75rem", border: "1.5px solid #F5E6D3" }} />
                <a href={qrDataUrl} download={`qr-bio-${userData.slug}.png`} style={{ padding: "0.45rem 0.9rem", background: "#FEF0DC", color: "#FB923C", fontWeight: 700, fontSize: "0.78rem", borderRadius: "0.6rem", textDecoration: "none" }}>
                  Descargar
                </a>
                <p style={{ fontSize: "0.68rem", color: "#A8A29E" }}>Para Instagram bio</p>
              </div>
            )}

            {/* QR carta */}
            {qrMenuDataUrl && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.05em" }}>Carta</p>
                <img src={qrMenuDataUrl} alt="QR carta" style={{ width: 110, height: 110, borderRadius: "0.75rem", border: "1.5px solid #F5E6D3" }} />
                <a href={qrMenuDataUrl} download={`qr-carta-${userData.slug}.png`} style={{ padding: "0.45rem 0.9rem", background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 700, fontSize: "0.78rem", borderRadius: "0.6rem", textDecoration: "none" }}>
                  Descargar
                </a>
                <p style={{ fontSize: "0.68rem", color: "#A8A29E" }}>Para las mesas</p>
              </div>
            )}

            {!qrMenuDataUrl && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "1rem", border: "2px dashed #F5E6D3", borderRadius: "0.75rem", minWidth: 110 }}>
                <p style={{ fontSize: "0.72rem", color: "#A8A29E", textAlign: "center" }}>
                  {isPro ? "Sube tu carta para generar el QR de mesa" : "QR de carta disponible en plan Pro"}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Eventos */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <p style={{ fontWeight: 700, color: "#1C1917", margin: 0 }}>
              Eventos
              {!isPro && <span style={{ marginLeft: "0.5rem", background: "#FEF3C7", color: "#92400E", borderRadius: "999px", padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700 }}>Pro</span>}
            </p>
            {isPro && (
              <button onClick={() => setMostrarFormEvento(v => !v)} style={{ padding: "0.4rem 0.9rem", background: mostrarFormEvento ? "#FEE2E2" : "linear-gradient(135deg,#FB923C,#F59E0B)", color: mostrarFormEvento ? "#DC2626" : "white", border: "none", borderRadius: "0.6rem", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                {mostrarFormEvento ? "Cancelar" : "+ Nuevo evento"}
              </button>
            )}
          </div>
          {!isPro && <p style={{ fontSize: "0.82rem", color: "#A8A29E" }}>Los eventos están disponibles en el plan Pro.</p>}
          {isPro && (<>

          {mostrarFormEvento && (
            <form onSubmit={crearEvento} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem", padding: "1rem", background: "#FEF0DC", borderRadius: "0.875rem" }}>
              <input required placeholder="Título del evento" value={nuevoEvento.titulo} onChange={e => setNuevoEvento(v => ({ ...v, titulo: e.target.value }))} style={inputStyle} />
              <textarea placeholder="Descripción (opcional)" value={nuevoEvento.descripcion} onChange={e => setNuevoEvento(v => ({ ...v, descripcion: e.target.value }))} style={{ ...inputStyle, resize: "vertical", minHeight: "60px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Fecha *</label>
                  <input required type="date" value={nuevoEvento.fecha} onChange={e => setNuevoEvento(v => ({ ...v, fecha: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Hora inicio</label>
                  <input type="time" value={nuevoEvento.hora_inicio} onChange={e => setNuevoEvento(v => ({ ...v, hora_inicio: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Hora fin</label>
                  <input type="time" value={nuevoEvento.hora_fin} onChange={e => setNuevoEvento(v => ({ ...v, hora_fin: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Precio</label>
                  <input placeholder="Gratis / 5€" value={nuevoEvento.precio} onChange={e => setNuevoEvento(v => ({ ...v, precio: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Enlace (opcional)</label>
                <input type="url" placeholder="https://..." value={nuevoEvento.enlace} onChange={e => setNuevoEvento(v => ({ ...v, enlace: e.target.value }))} style={inputStyle} />
              </div>
              <button type="submit" disabled={guardandoEvento} style={{ padding: "0.7rem", background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 700, border: "none", borderRadius: "0.75rem", cursor: "pointer" }}>
                {guardandoEvento ? "Guardando..." : "Guardar evento"}
              </button>
            </form>
          )}

          {eventos.length === 0
            ? <p style={{ color: "#A8A29E", fontSize: "0.85rem" }}>No hay eventos. ¡Añade el primero!</p>
            : eventos.map(ev => (
              <div key={ev.id} style={{ borderRadius: "0.875rem", background: "#FAFAF9", border: "1px solid #F5E6D3", marginBottom: "0.5rem", overflow: "hidden" }}>
                {editandoEvento?.id === ev.id ? (
                  <form onSubmit={guardarEdicionEvento} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}>
                    <input required placeholder="Título" value={editandoEvento.titulo} onChange={e => setEditandoEvento(v => v && ({ ...v, titulo: e.target.value }))} style={inputStyle} />
                    <textarea placeholder="Descripción (opcional)" value={editandoEvento.descripcion || ""} onChange={e => setEditandoEvento(v => v && ({ ...v, descripcion: e.target.value }))} style={{ ...inputStyle, resize: "vertical", minHeight: "60px" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Fecha *</label>
                        <input required type="date" value={editandoEvento.fecha} onChange={e => setEditandoEvento(v => v && ({ ...v, fecha: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Hora inicio</label>
                        <input type="time" value={editandoEvento.hora_inicio || ""} onChange={e => setEditandoEvento(v => v && ({ ...v, hora_inicio: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Hora fin</label>
                        <input type="time" value={editandoEvento.hora_fin || ""} onChange={e => setEditandoEvento(v => v && ({ ...v, hora_fin: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Precio</label>
                        <input placeholder="Gratis / 5€" value={editandoEvento.precio || ""} onChange={e => setEditandoEvento(v => v && ({ ...v, precio: e.target.value }))} style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#78716C", display: "block", marginBottom: "0.2rem" }}>Enlace (opcional)</label>
                      <input type="url" placeholder="https://..." value={editandoEvento.enlace || ""} onChange={e => setEditandoEvento(v => v && ({ ...v, enlace: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="submit" disabled={guardandoEvento} style={{ flex: 1, padding: "0.6rem", background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white", fontWeight: 700, border: "none", borderRadius: "0.75rem", cursor: "pointer", fontSize: "0.85rem" }}>
                        {guardandoEvento ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button type="button" onClick={() => setEditandoEvento(null)} style={{ padding: "0.6rem 1rem", background: "#F5F5F4", color: "#78716C", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.85rem" }}>
                    <div>
                      <p style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.9rem", margin: "0 0 0.2rem" }}>{ev.titulo}</p>
                      <p style={{ fontSize: "0.78rem", color: "#78716C", margin: 0 }}>
                        📅 {ev.fecha}{ev.hora_inicio ? ` · ${ev.hora_inicio}` : ""}{ev.hora_fin ? `–${ev.hora_fin}` : ""}{ev.precio ? ` · ${ev.precio}` : ""}
                      </p>
                      {ev.descripcion && <p style={{ fontSize: "0.78rem", color: "#A8A29E", margin: "0.2rem 0 0" }}>{ev.descripcion}</p>}
                      {ev.enlace && <a href={ev.enlace} target="_blank" rel="noopener" style={{ fontSize: "0.78rem", color: "#0EA5E9", margin: "0.2rem 0 0", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>🔗 {ev.enlace}</a>}
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <button onClick={() => setEditandoEvento(ev)} style={{ background: "#FEF0DC", color: "#FB923C", border: "none", borderRadius: "0.5rem", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>Editar</button>
                      <button onClick={() => eliminarEvento(ev.id)} style={{ background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: "0.5rem", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>Borrar</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          }</>)}
        </div>

        {/* Estadísticas */}
        <div style={cardStyle}>
          <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "1rem" }}>
            Visitas a tu página
            {!isPro && <span style={{ marginLeft: "0.5rem", background: "#FEF3C7", color: "#92400E", borderRadius: "999px", padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700 }}>Pro</span>}
          </p>
          {!isPro
            ? <p style={{ color: "#A8A29E", fontSize: "0.85rem" }}>Las estadísticas están disponibles en el plan Pro.</p>
            : !statsData
              ? <p style={{ color: "#A8A29E", fontSize: "0.85rem" }}>Cargando estadísticas...</p>
              : (
                <>
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, padding: "1rem", background: "#FEF0DC", borderRadius: "0.875rem", textAlign: "center" }}>
                      <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#FB923C" }}>{statsData.totalVisitas.toLocaleString("es")}</div>
                      <div style={{ fontSize: "0.75rem", color: "#78716C", marginTop: "0.2rem" }}>visitantes únicos (30 días)</div>
                    </div>
                    <div style={{ flex: 1, padding: "1rem", background: "#EDE9FE", borderRadius: "0.875rem", textAlign: "center" }}>
                      <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#7C3AED" }}>{statsData.visitasHoy}</div>
                      <div style={{ fontSize: "0.75rem", color: "#78716C", marginTop: "0.2rem" }}>visitas hoy</div>
                    </div>
                  </div>
                  {statsData.visitas.length > 0 && (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "60px" }}>
                      {(() => {
                        const max = Math.max(...statsData.visitas.map(v => v.uniq.uniques), 1);
                        return statsData.visitas.map((v, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }} title={`${v.dimensions.date}: ${v.uniq.uniques} visitas`}>
                            <div style={{ width: "100%", borderRadius: "0.25rem 0.25rem 0 0", background: "linear-gradient(180deg,#FB923C,#F59E0B)", height: `${Math.max(3, (v.uniq.uniques / max) * 50)}px` }} />
                            {i % 7 === 0 && <span style={{ fontSize: "0.5rem", color: "#A8A29E" }}>{v.dimensions.date.slice(5)}</span>}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  {statsData.visitas.length === 0 && <p style={{ color: "#A8A29E", fontSize: "0.85rem" }}>Aún no hay datos de visitas para tu página.</p>}
                </>
              )
          }
        </div>

      </div>
    </main>
  );
}
