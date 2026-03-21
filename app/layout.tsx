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
    title: "Tres y Cuarto — El tardeo empieza aquí",
    description: "Descubre los mejores bares, terrazas y locales de tardeo en tu ciudad. La plataforma del ocio de media tarde en España.",
    url: "https://tresycuarto.com",
    siteName: "Tres y Cuarto",
    locale: "es_ES",
    type: "website",
    images: [{ url: "https://tresycuarto.com/og/default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tres y Cuarto — El tardeo empieza aquí",
    description: "Descubre los mejores bares, terrazas y locales de tardeo en tu ciudad.",
    images: ["https://tresycuarto.com/og/default.png"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://tresycuarto.com/#website",
      url: "https://tresycuarto.com",
      name: "Tres y Cuarto",
      description: "La plataforma del tardeo en España",
      inLanguage: "es-ES",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://tresycuarto.com/locales/{search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://tresycuarto.com/#organization",
      name: "Tres y Cuarto",
      url: "https://tresycuarto.com",
      logo: { "@type": "ImageObject", url: "https://tresycuarto.com/icon-192.png" },
      sameAs: ["https://www.instagram.com/tresycuarto.es/"],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#FB923C" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} />
      </head>
      <body className={geist.className}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
