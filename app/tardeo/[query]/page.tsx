import type { Metadata } from "next";
import { redirect } from "next/navigation";
import cities from "../../../data/cities.json";
import localesSeo from "../../../data/locales-seo.json";
import TipoEnCiudadPage from "./TipoEnCiudadPage";

// ─── EXPERIMENTO 30/08/2026 — renderizado en servidor en ciudades medianas ────
// Estas páginas son el contenido con mejor conversión del sitio (CTR 6,06% frente
// al 1,87% de las fichas) pero llegaban a Google con ~550 caracteres: la lista de
// locales la pintaba solo el navegador.
//
// Hipótesis: servir la lista en el HTML sube el posicionamiento, y la subida será
// notable en ciudades medianas (donde competimos) y nula en las grandes (donde no).
//
// 30/08/2026 (2ª decisión): se extiende a TODAS las ciudades sin esperar las 4 semanas.
// Que el HTML servido indexe mejor que el pintado por JS no es una hipótesis a validar,
// y con estos volúmenes (89 impresiones en 3 meses en el grupo de prueba) la medición
// iba a salir ruidosa igualmente. Se asume que perdemos atribución limpia: si el tráfico
// sube en octubre no podremos separar esto de los canónicos, el 301 de www y las imágenes.
//
// SÍ se excluyen `planes-tarde` y `terraza-tarde`: 172 páginas que suman 42 impresiones
// en 3 meses porque nadie busca así. Darles contenido es engordar páginas que no van a
// posicionar, en un sitio que viene de una penalización por páginas pobres.
//
// NO es contenido nuevo: es el mismo que ya ve el usuario, servido de otra forma.
const TIPOS_PRUEBA = new Set(["bares", "cafeterias", "pubs", "terrazas", "tardeo"]);
const MAX_SERVIDOS = 24; // mismo LIMIT que usa el componente cliente

type LocalSeo = {
  id: string; nombre: string; ciudad: string; slug: string;
  rating: number | null; rating_count: number | null;
  horario: string | null; direccion: string | null; tipo: string | null;
  ciudad_slug: string;
};

function localesParaPrueba(tipoSlug: string, ciudadSlug: string, tipoDb: string | null) {
  if (!TIPOS_PRUEBA.has(tipoSlug)) return undefined;
  // MISMO orden que `/api/locales` (ORDER BY claimed DESC, nombre COLLATE NOCASE):
  // si no coincidiera, la página 2 traería locales solapados o repetidos.
  const lista = (localesSeo as LocalSeo[])
    .filter(l => l.ciudad_slug === ciudadSlug && (tipoDb ? l.tipo === tipoDb : true))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
    .slice(0, MAX_SERVIDOS)
    .map(l => ({
      id: l.id, nombre: l.nombre, tipo: l.tipo || "bar", ciudad: l.ciudad,
      direccion: l.direccion || "", horario: l.horario, terraza: 0,
      rating: l.rating, rating_count: l.rating_count,
    }));
  return lista.length ? lista : undefined;
}

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
        localesIniciales={localesParaPrueba(parsed!.tipoSlug, parsed!.ciudadSlug, TIPO_SLUG[parsed!.tipoSlug])}
      />
    </>
  );
}
