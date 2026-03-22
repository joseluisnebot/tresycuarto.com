import type { Metadata } from "next";
import { redirect } from "next/navigation";
import cities from "../../../data/cities.json";
import TipoEnCiudadPage from "./TipoEnCiudadPage";

const TIPO_SLUG: Record<string, string> = {
  bares: "bar",
  pubs: "pub",
  cafeterias: "cafe",
  terrazas: "biergarten",
};

const TIPO_LABEL: Record<string, string> = {
  bar: "Bares",
  pub: "Pubs",
  cafe: "Cafeterías",
  biergarten: "Terrazas",
};

const TIPO_DESC: Record<string, string> = {
  bar: "bares para tardear",
  pub: "pubs de tarde",
  cafe: "cafeterías para el tardeo",
  biergarten: "terrazas para el tardeo",
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
  const TIPOS = ["bares", "pubs", "cafeterias", "terrazas"];
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
  const tipo = TIPO_SLUG[parsed.tipoSlug];
  const ciudad = SLUG_A_CIUDAD[parsed.ciudadSlug];
  if (!tipo || !ciudad) return {};

  const label = TIPO_LABEL[tipo];
  const desc = TIPO_DESC[tipo];

  return {
    title: `${label} para el tardeo en ${ciudad} | tresycuarto`,
    description: `Los mejores ${desc} en ${ciudad}. Horarios, ubicación y terraza. Descubre dónde tomar algo en ${ciudad} por la tarde con tresycuarto.`,
    openGraph: {
      title: `${label} para el tardeo en ${ciudad}`,
      description: `Descubre los mejores ${desc} en ${ciudad}. Guía completa de tardeo.`,
    },
  };
}

export default async function Page(
  { params }: { params: Promise<{ query: string }> }
) {
  const { query } = await params;
  const parsed = parseQuery(query);
  if (!parsed || !TIPO_SLUG[parsed.tipoSlug] || !SLUG_A_CIUDAD[parsed.ciudadSlug]) {
    redirect("/");
  }
  return (
    <TipoEnCiudadPage
      tipoSlug={parsed!.tipoSlug}
      ciudadSlug={parsed!.ciudadSlug}
    />
  );
}
