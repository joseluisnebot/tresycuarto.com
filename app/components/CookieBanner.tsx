"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookies_ok")) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookies_ok", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      zIndex: 1000, width: "calc(100% - 3rem)", maxWidth: "560px",
      background: "white", border: "1px solid #F5E6D3", borderRadius: "1.25rem",
      padding: "1.25rem 1.5rem", boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
      display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
    }}>
      <p style={{ flex: 1, fontSize: "0.82rem", color: "#78716C", margin: 0, lineHeight: 1.6 }}>
        Usamos cookies propias para el funcionamiento de la web y recordar tus preferencias.
        No usamos cookies de seguimiento ni publicidad.{" "}
        <Link href="/privacidad" style={{ color: "#FB923C", textDecoration: "none", fontWeight: 600 }}>
          Política de privacidad
        </Link>
      </p>
      <button onClick={accept} style={{
        background: "linear-gradient(135deg,#FB923C,#F59E0B)", color: "white",
        border: "none", borderRadius: "0.75rem", padding: "0.6rem 1.25rem",
        fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap",
      }}>
        Entendido
      </button>
    </div>
  );
}
