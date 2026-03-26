"use client";

import { useEffect, useRef } from "react";

type LocalPin = {
  id: string;
  nombre: string;
  tipo: string;
  lat: number | null;
  lon: number | null;
  terraza: number;
  direccion?: string | null;
};

const TIPO_COLOR: Record<string, string> = {
  bar: "#FB923C",
  pub: "#A78BFA",
  cafe: "#F59E0B",
  biergarten: "#34D399",
};

type EventoPin = {
  lat: number | null;
  lon: number | null;
  radio: number;
  nombre: string;
} | null;

export default function MapaLocales({ locales, eventoPin = null }: { locales: LocalPin[]; ciudad: string; eventoPin?: EventoPin }) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  const pins = locales.filter(l => l.lat && l.lon);

  useEffect(() => {
    if (!mapRef.current || pins.length === 0) return;

    // Limpiar mapa anterior si existe
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import("leaflet").then(L => {
      // Fix icono por defecto de Leaflet en Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: false });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      pins.forEach(local => {
        const color = TIPO_COLOR[local.tipo] || "#FB923C";
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;border-radius:50% 50% 50% 0;
            background:${color};border:2.5px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.25);
            transform:rotate(-45deg);
            cursor:pointer;
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -30],
        });

        const tipoLabel: Record<string, string> = { bar: "Bar", pub: "Pub", cafe: "Cafetería", biergarten: "Terraza" };
        const popup = `
          <div style="font-family:Inter,sans-serif;min-width:160px">
            <span style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${color};background:#FEF0DC;padding:0.2rem 0.5rem;border-radius:999px">
              ${tipoLabel[local.tipo] || "Local"}
            </span>
            <div style="font-weight:700;font-size:0.95rem;margin:0.4rem 0 0.2rem;color:#1C1917">${local.nombre}</div>
            ${local.direccion ? `<div style="font-size:0.78rem;color:#78716C;margin-bottom:0.4rem">📍 ${local.direccion}</div>` : ""}
            ${local.terraza ? `<div style="font-size:0.75rem;color:#059669;margin-bottom:0.4rem">☀️ Con terraza</div>` : ""}
            <a href="/locales/${local.id}" style="display:inline-block;margin-top:0.3rem;font-size:0.8rem;font-weight:700;color:#FB923C;text-decoration:none">Ver ficha →</a>
          </div>`;

        L.marker([local.lat as number, local.lon as number], { icon })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 240 });
      });

      if (eventoPin && eventoPin.lat && eventoPin.lon) {
        L.circle([eventoPin.lat as number, eventoPin.lon as number], {
          radius: eventoPin.radio,
          color: "#7C3AED", fillColor: "#A78BFA", fillOpacity: 0.08,
          weight: 2, dashArray: "6 4",
        }).addTo(map);
        const evIcon = L.divIcon({
          className: "",
          html: '<div style="font-size:1.6rem;line-height:1">&#x1F4C5;</div>',
          iconSize: [32, 32], iconAnchor: [16, 32],
        });
        L.marker([eventoPin.lat as number, eventoPin.lon as number], { icon: evIcon })
          .addTo(map)
          .bindPopup('<b>' + eventoPin.nombre + '</b>', { maxWidth: 240 });
      }

      map.fitBounds(
        L.latLngBounds(pins.map(p => [p.lat, p.lon] as [number, number])),
        { padding: [32, 32], maxZoom: 15 }
      );
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locales, eventoPin]);

  if (pins.length === 0) return null;

  return (
    <div style={{
      borderRadius: "1.25rem", overflow: "hidden",
      border: "1px solid #F5E6D3", marginBottom: "1.5rem",
      height: "380px", position: "relative",
    }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      <div style={{
        position: "absolute", bottom: "0.75rem", left: "0.75rem", zIndex: 500,
        background: "rgba(255,248,239,0.92)", backdropFilter: "blur(4px)",
        padding: "0.3rem 0.75rem", borderRadius: "999px",
        fontSize: "0.75rem", fontWeight: 600, color: "#78716C",
        border: "1px solid #F5E6D3",
      }}>
        {pins.length} locales en el mapa
      </div>
    </div>
  );
}
