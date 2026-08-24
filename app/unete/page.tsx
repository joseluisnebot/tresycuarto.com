import type { Metadata } from "next";
import UnetePage from "./UnetePage";

// Componente cliente: los metadatos van en este envoltorio de servidor.
export const metadata: Metadata = {
  title: "Únete — Tres y Cuarto",
  description: "Suscríbete a tresycuarto y recibe los mejores planes de tardeo de tu ciudad.",
  alternates: { canonical: "https://tresycuarto.com/unete/" },
};

export default function Page() {
  return <UnetePage />;
}
