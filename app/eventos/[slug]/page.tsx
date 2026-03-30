import type { Metadata } from "next";
import EventoDetalle from "./EventoDetalle";
import eventosDestacados from "../../../data/eventos-destacados.json";

type EventoDestacado = {
  slug: string; nombre: string; ciudad: string; ciudad_slug: string;
  fecha_inicio: string; fecha_fin: string; tipo: string;
  descripcion_corta: string; descripcion: string;
  highlights: string[]; consejo_tardeo: string;
  seo_title: string; seo_description: string;
};

const EVENTOS = eventosDestacados as EventoDestacado[];

export async function generateStaticParams() {
  return EVENTOS.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ev = EVENTOS.find(e => e.slug === slug);
  if (!ev) return { title: "Evento — tresycuarto" };
  return {
    title: ev.seo_title,
    description: ev.seo_description,
    alternates: { canonical: `https://tresycuarto.com/eventos/${ev.slug}` },
    openGraph: {
      title: ev.seo_title,
      description: ev.seo_description,
      url: `https://tresycuarto.com/eventos/${ev.slug}`,
    },
  };
}

export default async function EventoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ev = EVENTOS.find(e => e.slug === slug);
  if (!ev) return <div style={{ padding: "4rem", textAlign: "center" }}>Evento no encontrado.</div>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": ev.nombre,
    "startDate": ev.fecha_inicio,
    "endDate": ev.fecha_fin,
    "location": {
      "@type": "City",
      "name": ev.ciudad,
      "addressCountry": "ES"
    },
    "description": ev.descripcion_corta,
    "url": `https://tresycuarto.com/eventos/${ev.slug}`,
    "organizer": {
      "@type": "Organization",
      "name": "tresycuarto.com"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventoDetalle evento={ev} />
    </>
  );
}
