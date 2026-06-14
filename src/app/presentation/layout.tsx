import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yourazz — La nouvelle génération des paiements en ligne",
  description: "Découvrez Yourazz : paiements par carte, Apple Pay, Google Pay et Litecoin. Dashboard temps réel, abonnements flexibles, sécurité maximale. Commencez gratuitement.",
  openGraph: {
    title: "Yourazz — La nouvelle génération des paiements en ligne",
    description: "Paiements simplifiés, crypto-friendly, conçus pour les créateurs modernes.",
    type: "website",
    url: "https://yourazz.xyz/presentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yourazz — Paiements nouvelle génération",
    description: "Paiements simplifiés, crypto-friendly, conçus pour les créateurs modernes.",
  },
};

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
