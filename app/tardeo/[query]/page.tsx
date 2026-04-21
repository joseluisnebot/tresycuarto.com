import type { Metadata } from "next";
import { redirect } from "next/navigation";
import cities from "../../../data/cities.json";
import TipoEnCiudadPage from "./TipoEnCiudadPage";

// null = todos los tipos (sin filtro de tipo en la API)
const TIPO_SLUG: Record<string, string | null> = {
  bares: "bar",
  pubs: "pub",
  cafeterias: "cafe",
  terrazas: "biergarten",
  "tardeo": null,
  "planes-tarde": null,
  "terraza-tarde": "biergarten",
};

const TIPO_TITLE: Record<string, string> = {
  bar: "Bares para el tardeo",
  pub: "Pubs para el tardeo",
  cafe: "Cafeterías para el tardeo",
  biergarten: "Terrazas para el tardeo",
  "tardeo": "Tardeo",
  "planes-tarde": "Planes de tarde",
  "terraza-tarde": "Terrazas para el tardeo",
};

const TIPO_DESC_META: Record<string, string> = {
  bar: "bares para tardear",
  pub: "pubs de tarde",
  cafe: "cafeterías para el tardeo",
  biergarten: "terrazas para el tardeo",
  "tardeo": "locales de tardeo",
  "planes-tarde": "planes y locales para la tarde",
  "terraza-tarde": "terrazas para el tardeo al aire libre",
};

const SLUG_A_CIUDAD = Object.fromEntries(
  (cities as { slug: string; nombre: string }[]).map(c => [c.slug, c.nombre])
);

function parseQuery(query: string): { tipoSlug: string; ciudadSlug: string } | null {
  const idx = query.indexOf("-en-");
  if (idx === -1) return null;
  return { tipoSlug: query.slice(0, idx), ciudadSlug: query.slice(idx + 4) };
}

export function generateStaticParams() {
  const TIPOS = ["bares", "pubs", "cafeterias", "terrazas", "tardeo", "planes-tarde", "terraza-tarde"];
  return (cities as { slug: string }[]).flatMap(c =>
    TIPOS.map(t => ({ query: `${t}-en-${c.slug}` }))
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ query: string }> }
): Promise<Metadata> {
  const { query } = await params;
  const parsed = parseQuery(query);
  if (!parsed) return {};
  if (!(parsed.tipoSlug in TIPO_SLUG)) return {};
  const ciudad = SLUG_A_CIUDAD[parsed.ciudadSlug];
  if (!ciudad) return {};

  const title = TIPO_TITLE[parsed.tipoSlug] || "Tardeo";
  const desc = TIPO_DESC_META[parsed.tipoSlug] || "locales de tardeo";

  const canonicalUrl = `https://tresycuarto.com/tardeo/${query}/`;

  return {
    title: `${title} en ${ciudad} | tresycuarto`,
    description: `Los mejores ${desc} en ${ciudad}. Horarios, ubicación y terraza. Descubre dónde disfrutar la tarde en ${ciudad} con tresycuarto.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${title} en ${ciudad}`,
      description: `Guía completa de ${desc} en ${ciudad}.`,
      url: canonicalUrl,
    },
  };
}

export default async function Page(
  { params }: { params: Promise<{ query: string }> }
) {
  const { query } = await params;
  const parsed = parseQuery(query);
  if (!parsed || !(parsed.tipoSlug in TIPO_SLUG) || !SLUG_A_CIUDAD[parsed.ciudadSlug]) {
    redirect("/");
  }

  const ciudad = SLUG_A_CIUDAD[parsed!.ciudadSlug];
  const title = TIPO_TITLE[parsed!.tipoSlug];
  const desc = TIPO_DESC_META[parsed!.tipoSlug];

  const pageUrl = `https://tresycuarto.com/tardeo/${query}/`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${title} en ${ciudad}`,
    "description": `Los mejores ${desc} en ${ciudad}. Horarios, ubicación y terraza.`,
    "url": pageUrl,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://tresycuarto.com" },
        { "@type": "ListItem", "position": 2, "name": ciudad, "item": `https://tresycuarto.com/locales/${parsed!.ciudadSlug}` },
        { "@type": "ListItem", "position": 3, "name": title, "item": pageUrl },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <TipoEnCiudadPage
        tipoSlug={parsed!.tipoSlug}
        ciudadSlug={parsed!.ciudadSlug}
      />
    </>
  );
}
