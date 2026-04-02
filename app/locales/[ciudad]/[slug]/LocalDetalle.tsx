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

  useEffect(() => {
    fetch(`/api/locales?ciudad=${encodeURIComponent(local.ciudad)}&limite=6`)
      .then((r) => r.json())
      .then((d) => {
        const otros = (d.locales || []).filter((l: LocalCercano) => l.id !== local.id).slice(0, 4);
        setCercanos(otros);
      })
      .catch(() => {});
  }, [local.id, local.ciudad]);

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
                  href={c.slug ? `/locales/${ciudadSlug}/${c.slug}` : `/locales/${ciudadSlug}`}
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
