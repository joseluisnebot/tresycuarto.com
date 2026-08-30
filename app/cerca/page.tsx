import type { Metadata } from "next";
import CercaPage from "./CercaPage";

export const metadata: Metadata = {
  title: "Tardeo cerca de mí — bares y terrazas a tu alrededor",
  description: "Encuentra bares, cafeterías y terrazas de tardeo cerca de donde estás ahora. Con distancia, valoración y si tienen terraza.",
  alternates: { canonical: "https://tresycuarto.com/cerca/" },
};

export default function Page() {
  return <CercaPage />;
}
