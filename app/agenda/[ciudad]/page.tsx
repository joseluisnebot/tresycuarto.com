import type { Metadata } from "next";
import cities from "../../../data/cities.json";
import AgendaPage from "./AgendaPage";

type CityEntry = { slug: string; nombre: string };

const SLUG_A_CIUDAD = Object.fromEntries(
  (cities as CityEntry[]).map(c => [c.slug, c.nombre])
);

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
    title: `Agenda de ${nombre} — Eventos, conciertos y planes | tresycuarto`,
    description: `Qué hacer en ${nombre}: agenda de eventos, conciertos, ferias y planes para el fin de semana. Actualizada cada día.`,
    openGraph: {
      title: `Agenda de ${nombre} — Eventos y planes | tresycuarto`,
      description: `Qué hacer en ${nombre}: agenda de eventos, conciertos, ferias y planes. Actualizada cada día.`,
    },
  };
}

export default async function Page(
  { params }: { params: Promise<{ ciudad: string }> }
) {
  const { ciudad } = await params;
  const nombre = SLUG_A_CIUDAD[ciudad];

  const schema = nombre ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Agenda de eventos en ${nombre}`,
    description: `Eventos, conciertos, ferias y planes en ${nombre}. Agenda actualizada.`,
    url: `https://tresycuarto.com/agenda/${ciudad}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://tresycuarto.com" },
        { "@type": "ListItem", position: 2, name: `Tardeo en ${nombre}`, item: `https://tresycuarto.com/locales/${ciudad}` },
        { "@type": "ListItem", position: 3, name: `Agenda ${nombre}`, item: `https://tresycuarto.com/agenda/${ciudad}` },
      ],
    },
  } : null;

  return (
    <>
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <AgendaPage slug={ciudad} />
    </>
  );
}
