import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad — Tres y Cuarto",
};

export default function Privacidad() {
  return (
    <main style={{ background: "#FFF8EF", minHeight: "100vh" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "1rem 1.5rem",
        borderBottom: "1px solid #F5E6D3", background: "rgba(255,248,239,0.95)",
        position: "sticky", top: 0,
      }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.1rem", color: "#1C1917" }}>
          tres<span style={{ color: "#FB923C" }}>y</span>cuarto
        </Link>
      </nav>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "3rem 1.5rem", color: "#1C1917" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: "0.5rem" }}>Política de privacidad</h1>
        <p style={{ color: "#A8A29E", fontSize: "0.85rem", marginBottom: "2.5rem" }}>Última actualización: marzo 2026</p>

        <Section title="1. Responsable del tratamiento">
          <p>Jose Luis Nebot — <a href="mailto:hola@tresycuarto.com" style={{ color: "#FB923C" }}>hola@tresycuarto.com</a></p>
        </Section>

        <Section title="2. Qué datos recogemos">
          <p>Únicamente recogemos los datos que tú nos proporcionas voluntariamente:</p>
          <ul>
            <li><strong>Suscriptores:</strong> email y ciudad cuando te suscribes para recibir novedades.</li>
            <li><strong>Propietarios de locales:</strong> email, contraseña (cifrada) y datos del local (nombre, dirección, teléfono, web, Instagram, horario) cuando creas una cuenta de propietario.</li>
            <li><strong>Solicitudes de alta:</strong> datos del local si rellenas el formulario de alta manual.</li>
          </ul>
          <p>No usamos Google Analytics ni ninguna herramienta de tracking de terceros. Las estadísticas de visitas se obtienen de forma agregada y anónima a través de Cloudflare.</p>
        </Section>

        <Section title="3. Para qué usamos tus datos">
          <ul>
            <li><strong>Suscriptores:</strong> enviarte actualizaciones sobre locales de tardeo en tu ciudad.</li>
            <li><strong>Propietarios:</strong> gestionar tu cuenta, mostrar la ficha pública de tu local en tresycuarto.com, y enviarte emails transaccionales (confirmación de email, notificaciones de cuenta).</li>
          </ul>
          <p>No cedemos tus datos a terceros ni los usamos para publicidad.</p>
        </Section>

        <Section title="4. Cookies y almacenamiento local">
          <p>Solo usamos almacenamiento local estrictamente necesario para el funcionamiento del sitio (mantener tu sesión si tienes una cuenta). No usamos cookies de seguimiento, publicidad ni analítica de terceros.</p>
        </Section>

        <Section title="5. Envío de emails">
          <p>Los emails transaccionales y de newsletter se envían a través de proveedores externos de confianza que actúan como encargados del tratamiento bajo acuerdo de confidencialidad. No usamos tus datos para ningún otro fin.</p>
        </Section>

        <Section title="6. Tus derechos">
          <p>Puedes ejercer tus derechos de acceso, rectificación, supresión y oposición escribiéndonos a <a href="mailto:hola@tresycuarto.com" style={{ color: "#FB923C" }}>hola@tresycuarto.com</a>. Para darte de baja de las comunicaciones usa el enlace al pie de cada email.</p>
        </Section>

        <Section title="7. Conservación de datos">
          <ul>
            <li><strong>Suscriptores:</strong> mientras estés suscrito. Puedes darte de baja en cualquier momento.</li>
            <li><strong>Cuentas de propietarios:</strong> mientras la cuenta esté activa. Puedes solicitar la eliminación por email.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "#1C1917" }}>{title}</h2>
      <div style={{ fontSize: "0.9rem", color: "#78716C", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}
