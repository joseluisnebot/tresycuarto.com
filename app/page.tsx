import type { Metadata } from "next";
import HomePage from "./HomePage";

// La home es un componente cliente (HomePage.tsx) y por eso no podía exportar
// metadata: se quedaba sin canonical y Google la marcaba como duplicada de
// www.tresycuarto.com. Este envoltorio de servidor solo aporta los metadatos.
export const metadata: Metadata = {
  alternates: { canonical: "https://tresycuarto.com/" },
};

export default function Page() {
  return <HomePage />;
}
