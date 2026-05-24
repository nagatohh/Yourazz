import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-zinc-800/50 glass-dark">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
              <span className="text-sm font-bold text-white">Y</span>
            </div>
            <span className="text-lg font-bold text-white">Yourazz</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Commencer <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/20 via-zinc-950 to-zinc-950" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-1.5 text-sm text-zinc-300">
            <Zap className="h-3.5 w-3.5 text-brand-500" />
            Paiements instantanés pour les pros
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white sm:text-7xl">
            Recevez vos paiements{" "}
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              sans friction
            </span>
          </h1>
          <p className="mb-10 text-lg text-zinc-400 sm:text-xl">
            Créez votre lien de paiement, partagez-le, et recevez de l&apos;argent sur votre compte bancaire.
            Carte, virement, Apple Pay — tout est inclus.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Créer mon compte gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">Découvrir</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Tout ce dont vous avez besoin</h2>
            <p className="text-zinc-400">Une plateforme complète pour gérer vos paiements.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CreditCard, title: "Multi-méthodes", desc: "Carte, virement, Apple Pay, Google Pay" },
              { icon: Zap, title: "Instantané", desc: "Paiements crédités en temps réel sur votre wallet" },
              { icon: Shield, title: "Sécurisé", desc: "Chiffrement, KYC, audit trail complet" },
              { icon: Globe, title: "Lien public", desc: "Partagez un lien et recevez des paiements" },
            ].map((f) => (
              <div key={f.title} className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 transition-all hover:border-brand-600/30 hover:bg-zinc-900/60">
                <div className="mb-4 inline-flex rounded-lg bg-brand-600/10 p-2.5">
                  <f.icon className="h-5 w-5 text-brand-500" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-md gradient-brand flex items-center justify-center">
              <span className="text-xs font-bold text-white">Y</span>
            </div>
            <span className="font-semibold text-white">Yourazz</span>
          </div>
          <p className="text-sm text-zinc-500">&copy; 2024 Yourazz. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
