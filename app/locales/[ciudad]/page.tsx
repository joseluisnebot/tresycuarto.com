import cities from "../../../data/cities.json";
import CiudadPage from "./CiudadPage";

export function generateStaticParams() {
  return cities.map((c: { slug: string }) => ({ ciudad: c.slug }));
}

export default function Page({ params }: { params: { ciudad: string } }) {
  return <CiudadPage slug={params.ciudad} />;
}
