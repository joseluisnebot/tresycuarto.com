import Link from "next/link";

const faqs = [
  {
    section: "Para usuarios",
    items: [
      {
        q: "¿Qué es tresycuarto?",
        a: "Una plataforma para descubrir bares, terrazas y cafeterías con horario de tarde en España. Mapeamos los mejores locales para que sepas dónde tardeear sin perder el tiempo.",
      },
      {
        q: "¿Es gratuito para los usuarios?",
        a: "Sí, completamente gratis. Puedes explorar locales, ver fichas completas y suscribirte para recibir novedades de tu ciudad sin ningún coste.",
      },
      {
        q: "¿En qué ciudades está disponible?",
        a: "Actualmente tenemos locales en Madrid, Barcelona, Valencia, Sevilla, Bilbao, Málaga, Zaragoza y Murcia. Seguimos añadiendo ciudades continuamente.",
      },
      {
        q: "¿Cómo me suscribo para recibir novedades?",
        a: "Desde la página principal puedes dejar tu email y seleccionar las ciudades que te interesan. Te avisamos cuando haya novedades de locales o eventos en tu zona.",
      },
    ],
  },
  {
    section: "Para propietarios",
    items: [
      {
        q: "¿Mi local ya está en la base de datos?",
        a: "Probablemente sí. Tenemos más de 14.000 locales indexados en toda España. Al registrarte puedes buscarlo por nombre y ciudad y reclamarlo en menos de 2 minutos.",
      },
      {
        q: "¿Cuánto cuesta registrar mi local?",
        a: "Tienes 14 días de prueba gratuita, sin tarjeta de crédito. Después el plan cuesta 9 €/mes o 79 €/año (ahorra 29 €). Sin permanencia, cancela cuando quieras.",
      },
      {
        q: "¿Qué incluye el plan?",
        a: "Perfil completo editable, galería de fotos, subida de carta o menú en PDF, publicación de eventos propios, enlace de bio para Instagram y estadísticas de visitas. Todo desde un panel sencillo.",
      },
      {
        q: "¿Qué pasa cuando termina el periodo de prueba?",
        a: "Tus datos y tu página pública se conservan. Las funciones avanzadas (galería, carta, eventos, estadísticas) quedan pausadas hasta que actives el plan de pago.",
      },
      {
        q: "¿Puedo cancelar en cualquier momento?",
        a: "Sí. Sin permanencia ni letra pequeña. Puedes cancelar tu suscripción desde el panel de tu local en cualquier momento.",
      },
      {
        q: "¿Cómo funciona el enlace de bio?",
        a: "Al registrar tu local obtienes una URL del tipo tresycuarto.com/tu-local que puedes poner en la bio de Instagram, TikTok, Facebook o donde quieras. Desde esa página tus clientes ven tu carta, fotos, horario y próximos eventos.",
      },
      {
        q: "¿Puedo tener más de un local en la misma cuenta?",
        a: "Sí. Desde tu panel puedes añadir varios locales a la misma cuenta y cambiar entre ellos fácilmente.",
      },
    ],
  },
];

export default function FAQ() {
  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh", fontFamily: "inherit" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid #F5E6D3", background: "rgba(255,248,239,0.95)" }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.03em", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
        <Link href="/contacto" style={{ textDecoration: "none", fontSize: "0.85rem", color: "#78716C", fontWeight: 600 }}>
          Contacto
        </Link>
      </nav>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#1C1917", lineHeight: 1.2 }}>
            Preguntas frecuentes
          </h1>
          <p style={{ color: "#78716C", marginTop: "0.75rem", fontSize: "1rem" }}>
            ¿No encuentras lo que buscas?{" "}
            <Link href="/contacto" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 600 }}>
              Escríbenos
            </Link>
          </p>
        </div>

        {faqs.map((group) => (
          <div key={group.section} style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#FB923C", marginBottom: "1rem" }}>
              {group.section}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {group.items.map((item, i) => (
                <div key={i} style={{ background: "white", borderRadius: "1rem", border: "1px solid #F5E6D3", padding: "1.25rem 1.5rem" }}>
                  <p style={{ fontWeight: 700, color: "#1C1917", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                    {item.q}
                  </p>
                  <p style={{ color: "#78716C", fontSize: "0.875rem", lineHeight: 1.65 }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ textAlign: "center", background: "white", borderRadius: "1.25rem", border: "1px solid #F5E6D3", padding: "2rem" }}>
          <p style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.5rem" }}>¿Tienes otra pregunta?</p>
          <p style={{ color: "#78716C", fontSize: "0.875rem", marginBottom: "1.25rem" }}>Estamos aquí para ayudarte.</p>
          <Link href="/contacto" style={{
            textDecoration: "none", fontWeight: 700, fontSize: "0.95rem", color: "white",
            background: "linear-gradient(135deg,#FB923C,#F59E0B)", padding: "0.75rem 1.75rem", borderRadius: "0.875rem",
          }}>
            Contactar →
          </Link>
        </div>

      </div>

      <footer style={{ borderTop: "1px solid #F5E6D3", padding: "1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", color: "#A8A29E" }}>
          <Link href="/" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 700 }}>tresycuarto.com</Link>
          {" · "}El tardeo en España
          {" · "}
          <Link href="/contacto" style={{ color: "#A8A29E", textDecoration: "none" }}>Contacto</Link>
          {" · "}
          <Link href="/privacidad" style={{ color: "#A8A29E", textDecoration: "none" }}>Privacidad</Link>
        </p>
      </footer>

    </main>
  );
}
