"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Local = {
  id: string;
  nombre: string;
  ciudad: string;
  ciudad_slug: string;
  slug: string;
  rating: number | null;
  rating_count: number | null;
  photo_url: string | null;
  horario: string | null;
  direccion: string | null;
  tipo: string | null;
  instagram: string | null;
  web: string | null;
  telefono: string | null;
};

type LocalCercano = {
  id: string;
  nombre: string;
  tipo: string;
  photo_url: string | null;
  rating: number | null;
  slug: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  bar: "Bar",
  pub: "Pub",
  cafe: "Cafetería",
  restaurant: "Restaurante",
  nightclub: "Discoteca",
  lounge: "Lounge",
};

const PLACEHOLDER: Record<string, string> = {
  bar: "https://tresycuarto.com/icon-192.png",
  pub: "https://tresycuarto.com/icon-192.png",
  cafe: "https://tresycuarto.com/icon-192.png",
};

export default function LocalDetalle({ local, ciudadSlug }: { local: Local; ciudadSlug: string }) {
  const [cercanos, setCercanos] = useState<LocalCercano[]>([]);
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    fetch(`/api/locales?ciudad=${encodeURIComponent(local.ciudad)}&limite=6`)
      .then((r) => r.json())
      .then((d) => {
        const otros = (d.locales || []).filter((l: LocalCercano) => l.id !== local.id).slice(0, 4);
        setCercanos(otros);
      })
      .catch(() => {});
  }, [local.id, local.ciudad]);

  useEffect(() => {
    fetch(`/api/app/local?ciudad=${encodeURIComponent(ciudadSlug)}&slug=${encodeURIComponent(local.slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.local) {
          setClaimed(d.local.claimed === 1);
          if (d.local.lat && d.local.lon) setCoords({ lat: d.local.lat, lon: d.local.lon });
        }
      })
      .catch(() => {});
  }, [ciudadSlug, local.slug]);

  const tipo = TIPO_LABEL[local.tipo ?? ""] || "Local";
  const stars = local.rating ? Math.round(local.rating) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#FFF8EF", fontFamily: "system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e7e5e4", padding: "0 1.5rem", height: "56px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 800, fontSize: "1.2rem", color: "#1C1917" }}>
          tresycuarto
        </Link>
        <span style={{ margin: "0 0.5rem", color: "#a8a29e" }}>/</span>
        <Link href={`/locales/${ciudadSlug}`} style={{ textDecoration: "none", color: "#78716c", fontSize: "0.9rem" }}>
          {local.ciudad}
        </Link>
        <span style={{ margin: "0 0.5rem", color: "#a8a29e" }}>/</span>
        <span style={{ color: "#1C1917", fontSize: "0.9rem", fontWeight: 600 }}>{local.nombre}</span>
      </nav>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Hero photo */}
        {local.photo_url && (
          <div style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "1.5rem", height: "280px" }}>
            <img
              src={local.photo_url}
              alt={local.nombre}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ background: "#FEF0DC", color: "#FB923C", borderRadius: "999px", padding: "0.2rem 0.75rem", fontSize: "0.78rem", fontWeight: 700 }}>
              {tipo}
            </span>
            {local.rating && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", color: "#78716c" }}>
                <span style={{ color: "#F59E0B" }}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
                <strong style={{ color: "#1C1917" }}>{local.rating.toFixed(1)}</strong>
                {local.rating_count && <span>({local.rating_count.toLocaleString("es-ES")} reseñas)</span>}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#1C1917", margin: "0 0 0.5rem" }}>
            {local.nombre}
          </h1>
          {local.direccion && (
            <p style={{ color: "#78716c", margin: "0", fontSize: "0.95rem" }}>
              📍 {local.direccion}, {local.ciudad}
            </p>
          )}
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
          {local.horario && (
            <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem 1.25rem", border: "1px solid #e7e5e4" }}>
              <div style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.25rem" }}>🕐 Horario</div>
              <div style={{ color: "#57534e", fontSize: "0.9rem" }}>{local.horario}</div>
            </div>
          )}
          {local.telefono && (
            <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem 1.25rem", border: "1px solid #e7e5e4" }}>
              <div style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.25rem" }}>📞 Teléfono</div>
              <a href={`tel:${local.telefono}`} style={{ color: "#FB923C", textDecoration: "none", fontSize: "0.9rem" }}>
                {local.telefono}
              </a>
            </div>
          )}
          {local.web && (
            <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem 1.25rem", border: "1px solid #e7e5e4" }}>
              <div style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.25rem" }}>🌐 Web</div>
              <a href={local.web} target="_blank" rel="noopener noreferrer" style={{ color: "#FB923C", textDecoration: "none", fontSize: "0.9rem" }}>
                {local.web.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {local.instagram && (
            <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem 1.25rem", border: "1px solid #e7e5e4" }}>
              <div style={{ fontWeight: 700, color: "#1C1917", marginBottom: "0.25rem" }}>📷 Instagram</div>
              <a href={`https://instagram.com/${local.instagram}`} target="_blank" rel="noopener noreferrer" style={{ color: "#FB923C", textDecoration: "none", fontSize: "0.9rem" }}>
                @{local.instagram}
              </a>
            </div>
          )}
        </div>

        {/* Mapa + Cómo llegar */}
        {coords && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e7e5e4", marginBottom: "0.75rem", height: "220px" }}>
              <iframe
                title={`Mapa de ${local.nombre}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.005},${coords.lat - 0.005},${coords.lon + 0.005},${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat},${coords.lon}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                loading="lazy"
              />
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: "#FB923C", color: "#fff", borderRadius: "999px",
                padding: "0.55rem 1.4rem", textDecoration: "none",
                fontWeight: 700, fontSize: "0.875rem",
              }}
            >
              🗺️ Cómo llegar
            </a>
          </div>
        )}

        {/* CTA Propietario */}
        {claimed === true && (
          <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: "14px", padding: "1rem 1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.9rem" }}>Local verificado</div>
              <div style={{ fontSize: "0.8rem", color: "#4ade80" }}>Este local ha sido reclamado y verificado por su propietario.</div>
            </div>
          </div>
        )}
        {claimed === false && (
          <div style={{ background: "#fff", border: "1.5px dashed #F59E0B", borderRadius: "14px", padding: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>🏪</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1C1917", marginBottom: "0.4rem" }}>
                  ¿Eres el propietario de {local.nombre}?
                </div>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#78716c", lineHeight: 1.5 }}>
                  Reclama tu ficha gratis y gestiona tu presencia en tresycuarto.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
                  {["📸 Subir fotos", "🕐 Actualizar horarios", "📅 Publicar eventos", "🎵 Añadir servicios"].map(item => (
                    <span key={item} style={{ fontSize: "0.75rem", background: "#FEF0DC", color: "#FB923C", borderRadius: "999px", padding: "0.2rem 0.7rem", fontWeight: 600 }}>
                      {item}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/unete?local=${encodeURIComponent(local.id)}&nombre=${encodeURIComponent(local.nombre)}&ciudad=${encodeURIComponent(local.ciudad)}`}
                  style={{ display: "inline-block", background: "#F59E0B", color: "#fff", borderRadius: "999px", padding: "0.55rem 1.4rem", textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}
                >
                  Reclamar esta ficha →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Back to city */}
        <Link
          href={`/locales/${ciudadSlug}`}
          style={{ display: "inline-block", background: "#FB923C", color: "#fff", borderRadius: "999px", padding: "0.6rem 1.5rem", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem", marginBottom: "2rem" }}
        >
          ← Ver más locales en {local.ciudad}
        </Link>

        {/* Nearby */}
        {cercanos.length > 0 && (
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1C1917", marginBottom: "1rem" }}>
              Más tardeo en {local.ciudad}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
              {cercanos.map((c) => (
                <a
                  key={c.id}
                  href={c.slug && c.rating ? `/locales/${ciudadSlug}/${c.slug}` : `/locales/${ciudadSlug}`}
                  style={{ textDecoration: "none", background: "#fff", borderRadius: "10px", overflow: "hidden", border: "1px solid #e7e5e4" }}
                >
                  <div style={{ height: "100px", overflow: "hidden" }}>
                    <img
                      src={c.photo_url || PLACEHOLDER[c.tipo] || PLACEHOLDER.bar}
                      alt={c.nombre}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER.bar; }}
                    />
                  </div>
                  <div style={{ padding: "0.6rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1C1917", marginBottom: "0.1rem" }}>{c.nombre}</div>
                    {c.rating && <div style={{ fontSize: "0.75rem", color: "#78716c" }}>★ {c.rating.toFixed(1)}</div>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
