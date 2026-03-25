import Link from "next/link";

const features = [
  { icon: "✏️", title: "Perfil completo", desc: "Edita nombre, descripción, teléfono, web, Instagram y horario desde un panel sencillo." },
  { icon: "🔗", title: "Enlace de bio", desc: "Tu página propia en tresycuarto.com/tu-local. Ponla en la bio de Instagram, TikTok, Facebook o donde quieras." },
  { icon: "📱", title: "QR de menú", desc: "Sube tu carta en PDF o fotos. Genera un QR automáticamente para poner en las mesas." },
  { icon: "📅", title: "Eventos propios", desc: "Anuncia tus cervezas de bienvenida, conciertos o mercadillos. Lo enviamos a los suscriptores de tu ciudad." },
  { icon: "📊", title: "Estadísticas", desc: "Cuántas personas ven tu perfil, de dónde vienen. Sin coste extra." },
  { icon: "✅", title: "Badge verificado", desc: "Destaca en los listados con el sello de local verificado. Próximamente." },
];

// PRICING — comentado durante fase de captación (activar cuando se lance el modelo freemium)
// const pricing = [
//   { label: "14 días gratis", sub: "Sin tarjeta. Empieza hoy.", highlight: false },
//   { label: "9€ / mes", sub: "O 79€/año — ahorra 29€.", highlight: true },
//   { label: "Sin permanencia", sub: "Cancela cuando quieras.", highlight: false },
// ];

export default function ParaLocales() {
  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", fontFamily: "inherit" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3", background: "rgba(255,248,239,0.95)" }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/local/login" style={{ textDecoration: "none", fontSize: "0.9rem", color: "#78716C", fontWeight: 600 }}>
            Entrar
          </Link>
          <Link href="/local/registro" style={{
            textDecoration: "none", fontSize: "0.9rem", fontWeight: 700, color: "white",
            background: "linear-gradient(135deg,#FB923C,#F59E0B)", padding: "0.45rem 1rem", borderRadius: "0.75rem",
          }}>
            Registra tu local
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "3rem 1.5rem" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <span style={{ background: "#FEF0DC", color: "#FB923C", borderRadius: "999px", padding: "0.35rem 1rem", fontSize: "0.82rem", fontWeight: 700 }}>
            Para bares, cafeterías y locales de tarde
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, color: "#1C1917", lineHeight: 1.15, marginTop: "1rem" }}>
            Tu local en <span style={{ color: "#FB923C" }}>tresycuarto</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#78716C", marginTop: "1rem", maxWidth: "540px", margin: "1rem auto 0", lineHeight: 1.6 }}>
            Gestiona tu ficha, crea tu enlace de bio para Instagram y llega a miles de personas que buscan tardeo en tu ciudad.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "2rem" }}>
            <Link href="/local/registro" style={{
              textDecoration: "none", fontWeight: 800, fontSize: "1rem", color: "white",
              background: "linear-gradient(135deg,#FB923C,#F59E0B)", padding: "0.9rem 2rem", borderRadius: "1rem",
              boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
            }}>
              Empezar gratis →
            </Link>
            <a href="#como-funciona" style={{
              textDecoration: "none", fontWeight: 600, fontSize: "1rem", color: "#78716C",
              background: "white", padding: "0.9rem 2rem", borderRadius: "1rem",
              border: "1.5px solid #F5E6D3",
            }}>
              Ver más
            </a>
          </div>
          {/* FASE CAPTACIÓN: texto de precios comentado — descomentar al activar freemium
          <p style={{ fontSize: "0.78rem", color: "#A8A29E", marginTop: "0.75rem" }}>
            14 días gratis · Sin tarjeta de crédito · Cancela cuando quieras
          </p>
          */}
          <p style={{ fontSize: "0.78rem", color: "#A8A29E", marginTop: "0.75rem" }}>
            Gratis durante la fase de lanzamiento
          </p>
        </div>

        {/* Features */}
        <div id="como-funciona" style={{ marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1C1917", textAlign: "center", marginBottom: "2rem" }}>
            Todo lo que necesita tu local
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", padding: "1.5rem" }}>
                <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, color: "#1C1917", fontSize: "1rem", marginBottom: "0.35rem" }}>{f.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#78716C", lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PRICING — comentado durante fase de captación (descomentar cuando se lance freemium)
        <div style={{ background: "white", borderRadius: "1.5rem", border: "1px solid #F5E6D3", padding: "2.5rem", marginBottom: "4rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1C1917", marginBottom: "0.5rem" }}>Precio claro y justo</h2>
          <p style={{ color: "#78716C", fontSize: "0.9rem", marginBottom: "2rem" }}>Sin sorpresas. Sin letra pequeña.</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            {pricing.map((p, i) => (
              <div key={i} style={{
                padding: "1.25rem 1.75rem", borderRadius: "1.25rem",
                background: p.highlight ? "linear-gradient(135deg,#FB923C,#F59E0B)" : "#FEF0DC",
                color: p.highlight ? "white" : "#1C1917",
              }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>{p.label}</div>
                <div style={{ fontSize: "0.8rem", opacity: p.highlight ? 0.9 : undefined, color: p.highlight ? "white" : "#78716C", marginTop: "0.25rem" }}>{p.sub}</div>
              </div>
            ))}
          </div>
        </div>
        */}

        {/* CTA final */}
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#1C1917", marginBottom: "0.75rem" }}>
            ¿Tu local ya está en nuestra base de datos?
          </h2>
          <p style={{ color: "#78716C", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            Seguramente sí. Búscalo y reclámalo en 2 minutos.
          </p>
          <Link href="/local/registro" style={{
            textDecoration: "none", fontWeight: 800, fontSize: "1rem", color: "white",
            background: "linear-gradient(135deg,#FB923C,#F59E0B)", padding: "1rem 2.5rem", borderRadius: "1rem",
            boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
          }}>
            Reclamar mi local →
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #F5E6D3", padding: "2rem 1.5rem", textAlign: "center", marginTop: "4rem" }}>
        <p style={{ fontSize: "0.8rem", color: "#A8A29E" }}>
          <Link href="/" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 700 }}>tresycuarto.com</Link>
          {" · "}El tardeo en España
          {" · "}
          <Link href="/faq" style={{ color: "#A8A29E", textDecoration: "none" }}>FAQ</Link>
          {" · "}
          <Link href="/contacto" style={{ color: "#A8A29E", textDecoration: "none" }}>Contacto</Link>
          {" · "}
          <Link href="/privacidad" style={{ color: "#A8A29E", textDecoration: "none" }}>Privacidad</Link>
        </p>
      </footer>

    </main>
  );
}
