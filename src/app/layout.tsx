import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "YouRazz Official — Plateforme de paiement premium",
  description: "Recevez des paiements instantanément. Solution fintech premium pour professionnels exigeants.",
  metadataBase: new URL("https://yourazz.xyz"),
  openGraph: {
    title: "YouRazz Official 公式",
    description: "Plateforme de paiement premium. Créez un lien, recevez de l'argent instantanément.",
    siteName: "YouRazz",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans`}>{children}</body>
    </html>
  );
}
