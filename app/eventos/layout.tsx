import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eventos y tardeo en España — Conciertos, ferias y fiestas | tresycuarto",
  description: "Agenda de eventos para salir: conciertos, ferias, fiestas y festivales por toda España, con los bares de tardeo más cercanos a cada evento.",
  alternates: { canonical: "https://tresycuarto.com/eventos/" },
  openGraph: {
    title: "Eventos y tardeo en España | tresycuarto",
    description: "Agenda de eventos para salir por toda España, con los bares de tardeo más cercanos a cada uno.",
    url: "https://tresycuarto.com/eventos/",
  },
};

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
