import type { Metadata } from "next";
import cities from "../../../data/cities.json";
import ciudadContent from "../../../data/ciudad-content.json";
import CiudadPage from "./CiudadPage";

type CityEntry = { slug: string; nombre: string };
type ContentEntry = { coords?: { lat: number; lon: number }; intro?: string; faqs?: { q: string; a: string }[] };

const SLUG_A_CIUDAD = Object.fromEntries(
  (cities as CityEntry[]).map(c => [c.slug, c.nombre])
);
const CONTENT = ciudadContent as Record<string, ContentEntry>;

export function generateStaticParams() {
  return (cities as CityEntry[]).map(c => ({ ciudad: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ ciudad: string }> }
): Promise<Metadata> {
  const { ciudad } = await params;
  const nombre = SLUG_A_CIUDAD[ciudad];
  if (!nombre) return {};
  return {
    title: `Tardeo en ${nombre} — Bares, pubs y terrazas | tresycuarto`,
    description: `Guía de tardeo en ${nombre}: los mejores bares, pubs y terrazas con horarios y ubicación. Descubre dónde salir de tarde en ${nombre}.`,
    openGraph: {
      title: `Tardeo en ${nombre} — Bares, pubs y terrazas | tresycuarto`,
      description: `Guía de tardeo en ${nombre}: los mejores bares, pubs y terrazas con horarios y ubicación. Descubre dónde salir de tarde en ${nombre}.`,
    },
  };
}

export default async function Page(
  { params }: { params: Promise<{ ciudad: string }> }
) {
  const { ciudad } = await params;
  const nombre = SLUG_A_CIUDAD[ciudad];
  const content = CONTENT[nombre];
  const coords = content?.coords;

  const schemas: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `Locales de tardeo en ${nombre}`,
      "description": `Los mejores bares, pubs, cafeterías y terrazas para el tardeo en ${nombre}. Horarios y ubicación.`,
      "url": `https://tresycuarto.com/locales/${ciudad}`,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://tresycuarto.com" },
          { "@type": "ListItem", "position": 2, "name": nombre, "item": `https://tresycuarto.com/locales/${ciudad}` },
        ],
      },
      ...(coords ? {
        "spatialCoverage": {
          "@type": "Place",
          "name": nombre,
          "geo": { "@type": "GeoCoordinates", "latitude": coords.lat, "longitude": coords.lon },
        },
      } : {}),
    },
  ];

  if (content?.faqs && content.faqs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": content.faqs.map((f: { q: string; a: string }) => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a },
      })),
    });
  }

  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
      <CiudadPage slug={ciudad} />
    </>
  );
}
