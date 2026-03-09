import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import CookieBanner from "./components/CookieBanner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tres y Cuarto — El tardeo empieza aquí",
  description: "Descubre los mejores bares, terrazas y locales de tardeo en tu ciudad. La plataforma del ocio de media tarde en España.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "tresycuarto",
  },
  openGraph: {
    title: "Tres y Cuarto",
    description: "El tardeo empieza aquí",
    url: "https://tresycuarto.com",
    siteName: "Tres y Cuarto",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#FB923C" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} />
      </head>
      <body className={geist.className}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
