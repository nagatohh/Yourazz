import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// Une seule police téléchargée (Inter). Le monospace utilise la pile système
// (SF Mono, Consolas…) : zéro téléchargement, rendu natif sur chaque OS.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: {
    default: "Yourazz — Recevez, gérez et retirez vos paiements simplement",
    template: "%s — Yourazz",
  },
  description:
    "Plateforme de paiement en ligne : liens de paiement, carte bancaire, Apple Pay, Google Pay, dashboard financier et retraits sécurisés.",
  metadataBase: new URL("https://yourazz.xyz"),
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Yourazz — Plateforme de paiement",
    description:
      "Recevez, gérez et retirez vos paiements simplement. Carte, Apple Pay, Google Pay — sécurisé par Stripe.",
    siteName: "Yourazz",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} font-sans`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
