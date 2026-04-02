import type { Metadata } from "next";
import localesSeo from "../../../../data/locales-seo.json";
import LocalDetalle from "./LocalDetalle";

type LocalSeo = {
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

const LOCALES_MAP = new Map<string, LocalSeo>(
  (localesSeo as LocalSeo[]).map((l) => [`${l.ciudad_slug}/${l.slug}`, l])
);

const TIPO_LABEL: Record<string, string> = {
  bar: "Bar",
  pub: "Pub",
  cafe: "Cafetería",
  restaurant: "Restaurante",
  nightclub: "Discoteca",
  lounge: "Lounge",
};

export function generateStaticParams() {
  return (localesSeo as LocalSeo[]).map((l) => ({
    ciudad: l.ciudad_slug,
    slug: l.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudad: string; slug: string }>;
}): Promise<Metadata> {
  const { ciudad, slug } = await params;
  const local = LOCALES_MAP.get(`${ciudad}/${slug}`);
  if (!local) return {};

  const tipo = TIPO_LABEL[local.tipo ?? ""] || "Local";
  const title = `${local.nombre} — ${tipo} de tardeo en ${local.ciudad} | tresycuarto`;
  const description = `${local.nombre} en ${local.ciudad}${local.direccion ? `, ${local.direccion}` : ""}. ${local.rating ? `Valoración ${local.rating}/5. ` : ""}Horarios y más info en tresycuarto.com`;

  return {
    title,
    description,
    openGraph: {
      title: `${local.nombre} — Tardeo en ${local.ciudad}`,
      description,
      ...(local.photo_url ? { images: [{ url: local.photo_url }] } : {}),
    },
    alternates: {
      canonical: `https://tresycuarto.com/locales/${ciudad}/${slug}`,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ ciudad: string; slug: string }>;
}) {
  const { ciudad, slug } = await params;
  const local = LOCALES_MAP.get(`${ciudad}/${slug}`);

  if (!local) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Local no encontrado.</p>
        <a href={`/locales/${ciudad}`}>← Volver a {ciudad}</a>
      </div>
    );
  }

  const tipo = TIPO_LABEL[local.tipo ?? ""] || "Local";

  const schema = {
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    name: local.nombre,
    description: `${tipo} de tardeo en ${local.ciudad}`,
    url: `https://tresycuarto.com/locales/${ciudad}/${slug}`,
    ...(local.photo_url ? { image: local.photo_url } : {}),
    ...(local.direccion
      ? { address: { "@type": "PostalAddress", streetAddress: local.direccion, addressLocality: local.ciudad, addressCountry: "ES" } }
      : {}),
    ...(local.telefono ? { telephone: local.telefono } : {}),
    ...(local.rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: local.rating, bestRating: 5, ratingCount: local.rating_count || 1 } }
      : {}),
    ...(local.horario ? { openingHours: local.horario } : {}),
    ...(local.web ? { sameAs: [local.web] } : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://tresycuarto.com" },
      { "@type": "ListItem", position: 2, name: local.ciudad, item: `https://tresycuarto.com/locales/${ciudad}` },
      { "@type": "ListItem", position: 3, name: local.nombre, item: `https://tresycuarto.com/locales/${ciudad}/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <LocalDetalle local={local} ciudadSlug={ciudad} />
    </>
  );
}
