import type { Metadata } from "next";
import cities from "../../../data/cities.json";
import ciudadContent from "../../../data/ciudad-content.json";
import cityCounts from "../../../data/city-counts.json";
import CiudadPage from "./CiudadPage";

// ─── EXPERIMENTO 04/10/2026 — título y descripción en 11 ciudades ─────────────
// Search Console, 6 meses: las búsquedas de INTENCIÓN ("tardeo en X") convierten
// 3× mejor que las de marca (2,19% frente a 0,74% de CTR), pero en estas once
// ciudades salimos en posición 7-15 y nos llevamos una miseria. Salamanca: 271
// impresiones y 9 clics. Ciudad Real: posición 7,2 y 4 clics — ahí el problema
// no es posicionar, es que el resultado no invita a pinchar.
//
// Las 86 páginas de ciudad comparten HOY el mismo título, que además pasa de 60
// caracteres en los nombres largos (Jerez se queda en 69 y Google lo corta).
//
// Qué cambia: título más corto y con una cifra concreta, y descripción que
// responde a lo que se busca. Las otras 74 ciudades se quedan como están y
// hacen de GRUPO DE CONTROL: mismo sitio, mismo periodo, misma Google.
//
// Revisar a partir del 25/10/2026 comparando el CTR de estas once contra el
// resto. Si no se mueve, revertir es un `git revert` de este commit.
const EXPERIMENTO = new Set([
  "segovia", "salamanca", "jerez-de-la-frontera", "altea", "cuenca", "leon",
  "cordoba", "toledo", "torrevieja", "cullera", "ciudad-real",
]);
// Pamplona cumplía por tráfico pero solo tiene 7 locales: una cifra ahí resta.

const COUNTS = cityCounts as Record<string, number>;

/** Redondea a la baja a la decena para que la cifra aguante altas y bajas. */
function aproximado(n: number) {
  return Math.floor(n / 10) * 10;
}

function metaExperimento(nombre: string, slug: string) {
  const n = aproximado(COUNTS[nombre] || 0);
  if (!n) return null;
  const base = `Tardeo en ${nombre}: ${n}+ bares y terrazas`;
  // La marca solo si el título sigue cabiendo en lo que Google enseña.
  const title = base.length + 14 <= 60 ? `${base} | tresycuarto` : base;
  return {
    title,
    description: `Más de ${n} bares, cafeterías y terrazas para tardear en ${nombre}, con dirección y mapa. Encuentra dónde tomar algo esta tarde.`,
  };
}

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

  const nuevo = EXPERIMENTO.has(ciudad) ? metaExperimento(nombre, ciudad) : null;
  const title = nuevo?.title ?? `Tardeo en ${nombre} — Bares, pubs y terrazas | tresycuarto`;
  const description = nuevo?.description ??
    `Guía de tardeo en ${nombre}: los mejores bares, pubs y terrazas con horarios y ubicación. Descubre dónde salir de tarde en ${nombre}.`;

  return {
    title,
    description,
    alternates: { canonical: `https://tresycuarto.com/locales/${ciudad}/` },
    openGraph: { title, description },
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
