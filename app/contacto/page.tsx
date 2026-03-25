import Link from "next/link";

export default function Contacto() {
  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", fontFamily: "inherit" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3", background: "rgba(255,248,239,0.95)" }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
        <Link href="/faq" style={{ textDecoration: "none", fontSize: "0.85rem", color: "#78716C", fontWeight: 600 }}>
          FAQ
        </Link>
      </nav>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "4rem 1.5rem 5rem", textAlign: "center" }}>

        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✉️</div>

        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 900, color: "#1C1917", lineHeight: 1.2, marginBottom: "1rem" }}>
          Contacta con nosotros
        </h1>
        <p style={{ color: "#78716C", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2.5rem" }}>
          ¿Tienes dudas sobre tu local, una sugerencia o simplemente quieres decir hola?
          Escríbenos y te respondemos lo antes posible.
        </p>

        <a
          href="mailto:hola@tresycuarto.com"
          style={{
            display: "inline-block", textDecoration: "none", fontWeight: 800, fontSize: "1.1rem",
            color: "white", background: "linear-gradient(135deg,#FB923C,#F59E0B)",
            padding: "1rem 2.5rem", borderRadius: "1rem",
            boxShadow: "0 4px 20px rgba(251,146,60,0.35)",
          }}
        >
          hola@tresycuarto.com
        </a>

        <div style={{ marginTop: "3rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ background: "white", borderRadius: "1rem", border: "1px solid #F5E6D3", padding: "1rem 1.5rem", textAlign: "left" }}>
            <p style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Propietarios de locales</p>
            <p style={{ color: "#78716C", fontSize: "0.825rem" }}>Para cualquier gestión sobre tu perfil, facturación o dudas sobre el plan.</p>
          </div>
          <div style={{ background: "white", borderRadius: "1rem", border: "1px solid #F5E6D3", padding: "1rem 1.5rem", textAlign: "left" }}>
            <p style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Usuarios y visitantes</p>
            <p style={{ color: "#78716C", fontSize: "0.825rem" }}>¿Falta un local? ¿Datos incorrectos? Dinos y lo corregimos.</p>
          </div>
          <div style={{ background: "white", borderRadius: "1rem", border: "1px solid #F5E6D3", padding: "1rem 1.5rem", textAlign: "left" }}>
            <p style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Prensa y colaboraciones</p>
            <p style={{ color: "#78716C", fontSize: "0.825rem" }}>¿Quieres hablar sobre tresycuarto? Nos encantará.</p>
          </div>
        </div>

        <p style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#A8A29E" }}>
          También puedes consultar las{" "}
          <Link href="/faq" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 600 }}>
            preguntas frecuentes
          </Link>
          , igual ya está respondido.
        </p>

      </div>

      <footer style={{ borderTop: "1px solid #F5E6D3", padding: "1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", color: "#A8A29E" }}>
          <Link href="/" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 700 }}>tresycuarto.com</Link>
          {" · "}El tardeo en España
          {" · "}
          <Link href="/faq" style={{ color: "#A8A29E", textDecoration: "none" }}>FAQ</Link>
          {" · "}
          <Link href="/privacidad" style={{ color: "#A8A29E", textDecoration: "none" }}>Privacidad</Link>
        </p>
      </footer>

    </main>
  );
}
