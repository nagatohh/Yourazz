"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe, CreditCard, Lock, Fingerprint, Wallet, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[#030308] overflow-x-hidden">
      {/* Navbar */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 animate-fade-down ${
          scrolled ? "bg-[#030308]/90 backdrop-blur-2xl border-b border-white/[0.04]" : ""
        }`}
      >
        <div className="mx-auto flex h-16 sm:h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-[13px] text-zinc-500 hover:text-white transition-colors duration-300">
              Fonctionnalités
            </Link>
            <Link href="#pricing" className="text-[13px] text-zinc-500 hover:text-white transition-colors duration-300">
              Tarifs
            </Link>
            <Link href="#security" className="text-[13px] text-zinc-500 hover:text-white transition-colors duration-300">
              Sécurité
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                Connexion
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="group">
                <span className="flex items-center gap-1.5">
                  Commencer
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Button>
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[#030308]/95 backdrop-blur-xl md:hidden animate-fade-in">
          <nav className="flex flex-col items-center justify-center h-full gap-8">
            {[
              { href: "#features", label: "Fonctionnalités" },
              { href: "#pricing", label: "Tarifs" },
              { href: "#security", label: "Sécurité" },
              { href: "/login", label: "Connexion" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-xl font-medium text-zinc-300 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/register" onClick={() => setMenuOpen(false)}>
              <Button size="lg" className="mt-4">
                Créer mon compte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex items-center justify-center pt-16 sm:pt-[72px]">
        {/* Background - static, no JS animations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 h-[400px] w-[400px] sm:h-[600px] sm:w-[800px] rounded-full bg-brand-500/[0.07] blur-[120px] sm:blur-[180px]" />
          <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
          <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[80%] sm:w-[60%] h-[60px] bg-brand-500/[0.05] blur-[50px]" />
          <div className="hidden sm:block absolute top-[30%] left-[10%] h-[150px] w-[150px] rounded-full bg-purple-500/[0.04] blur-[80px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(225,29,72,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(225,29,72,0.015)_1px,transparent_1px)] bg-[size:60px_60px] sm:bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_30%,transparent_100%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6 text-center">
          {/* Badge */}
          <div className="mb-8 sm:mb-10 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm animate-fade-up [animation-delay:200ms]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
            </span>
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 tracking-wide">Plateforme de paiement premium</span>
          </div>

          {/* Logo */}
          <div className="mb-8 sm:mb-12 animate-fade-up [animation-delay:400ms]">
            <Logo size="lg" showTagline className="sm:hidden" />
            <Logo size="xl" showTagline className="hidden sm:flex" />
          </div>

          {/* Headline */}
          <div className="animate-fade-up [animation-delay:500ms]">
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
              Recevez vos paiements
              <br />
              <span className="gradient-text">instantanément</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="mt-5 sm:mt-7 mx-auto max-w-xl text-sm sm:text-base lg:text-lg text-zinc-500 leading-relaxed px-2 animate-fade-up [animation-delay:600ms]">
            Un lien. Un clic. L&apos;argent arrive.
            <br className="hidden sm:block" />
            <span className="text-zinc-400">Carte, Apple Pay, Google Pay</span> — premium, sécurisé, instantané.
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-fade-up [animation-delay:700ms]">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 sm:h-13 px-6 sm:px-8 text-[14px] sm:text-[15px] font-semibold glow-md group">
                Créer mon compte
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 sm:h-13 px-6 sm:px-8 text-[14px] sm:text-[15px] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]">
                Découvrir
              </Button>
            </Link>
          </div>

          {/* Trust */}
          <div className="mt-10 sm:mt-14 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-2 animate-fade-up [animation-delay:900ms]">
            {[
              { icon: Lock, text: "Chiffrement 256-bit" },
              { icon: Shield, text: "Conforme DSP2" },
              { icon: Fingerprint, text: "Auth sécurisée" },
            ].map((item) => (
              <span key={item.text} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-zinc-600 uppercase tracking-wider">
                <item.icon className="h-3 w-3 text-brand-500/50" />
                {item.text}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 bg-gradient-to-t from-[#030308] to-transparent pointer-events-none" />
      </section>

      {/* Features */}
      <section id="features" className="relative py-20 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-20">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/80 mb-3 sm:mb-4">
              Fonctionnalités
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight">
              Conçu pour performer
            </h2>
            <p className="mt-4 sm:mt-5 mx-auto max-w-md text-sm sm:text-base text-zinc-500">
              Chaque détail est pensé pour offrir une expérience de paiement sans friction.
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: CreditCard, title: "Multi-méthodes", desc: "Carte bancaire, Apple Pay, Google Pay — acceptez tous les moyens de paiement modernes." },
              { icon: Zap, title: "Instantané", desc: "L'argent arrive en temps réel sur votre wallet. Retirez vers votre IBAN quand vous voulez." },
              { icon: Shield, title: "Ultra-sécurisé", desc: "Chiffrement AES-256, conformité PSD2/DSP2, authentification forte." },
              { icon: Globe, title: "Lien universel", desc: "Un lien unique, partageable partout. Vos clients paient sans créer de compte." },
              { icon: Wallet, title: "Wallet intégré", desc: "Suivez vos revenus en temps réel. Historique complet, exports, analytics." },
              { icon: Fingerprint, title: "Identité vérifiée", desc: "Système d'invitation exclusif. Chaque membre est vérifié et approuvé." },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative p-5 sm:p-7 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-brand-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="mb-4 sm:mb-5 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] group-hover:border-brand-500/20 group-hover:bg-brand-500/[0.05] transition-all duration-300">
                    <feature.icon className="h-[18px] w-[18px] text-zinc-400 group-hover:text-brand-400 transition-colors duration-300" />
                  </div>
                  <h3 className="text-[14px] sm:text-[15px] font-semibold text-white mb-1.5 sm:mb-2">{feature.title}</h3>
                  <p className="text-[12px] sm:text-[13px] text-zinc-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Pricing */}
      <section id="pricing" className="relative py-20 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-brand-500/[0.03] blur-[100px] sm:blur-[150px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/80 mb-3 sm:mb-4">
              Tarification
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight">
              Simple et transparent
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-0 sm:divide-x sm:divide-white/[0.04]">
            {[
              { value: "0€", label: "Inscription", sub: "Gratuit" },
              { value: "1.5%", label: "Par transaction", sub: "Sans frais caché" },
              { value: "Instant", label: "Crédité", sub: "Temps réel" },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-2 sm:px-8 py-4 sm:py-6">
                <p className="text-2xl sm:text-4xl lg:text-5xl font-black gradient-text mb-1 sm:mb-2">{stat.value}</p>
                <p className="text-xs sm:text-sm font-medium text-white mb-0.5 sm:mb-1">{stat.label}</p>
                <p className="text-[10px] sm:text-xs text-zinc-600">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/80 mb-3 sm:mb-4">
                Sécurité
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4 sm:mb-6">
                Vos fonds sont
                <br />
                <span className="gradient-text">en sécurité absolue</span>
              </h2>
              <p className="text-sm sm:text-base text-zinc-500 leading-relaxed mb-6 sm:mb-8">
                Infrastructure bancaire de niveau institutionnel. Chaque transaction est chiffrée, vérifiée et auditée.
              </p>
              <div className="space-y-3 sm:space-y-4">
                {[
                  "Chiffrement AES-256 bout en bout",
                  "Conformité PSD2 / DSP2 européenne",
                  "Authentification forte 3D Secure",
                  "Monitoring anti-fraude temps réel",
                  "Audit trail de chaque opération",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    </div>
                    <span className="text-xs sm:text-sm text-zinc-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl sm:rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-8 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-brand-500/[0.02] to-transparent" />
                <div className="relative space-y-3 sm:space-y-5">
                  {[
                    { label: "Statut système", value: "Opérationnel", color: "text-emerald-400" },
                    { label: "Chiffrement", value: "AES-256-GCM", color: "text-white" },
                    { label: "Uptime", value: "99.99%", color: "text-white" },
                    { label: "Vérification", value: "Il y a 2 min", color: "text-zinc-400" },
                    { label: "SSL", value: "Valide", color: "text-emerald-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 sm:py-3 border-b border-white/[0.04] last:border-0">
                      <span className="text-[12px] sm:text-[13px] text-zinc-500">{row.label}</span>
                      <span className={`text-[12px] sm:text-[13px] font-medium font-mono ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-20 sm:py-32">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-20">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/80 mb-3 sm:mb-4">
              Processus
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight">
              Trois étapes, c&apos;est tout
            </h2>
          </div>

          <div className="relative">
            <div className="hidden sm:block absolute top-[52px] left-[16.5%] right-[16.5%] h-[1px] bg-gradient-to-r from-brand-500/20 via-brand-500/10 to-brand-500/20" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { n: "01", title: "Inscription", desc: "Créez votre compte en 30 secondes. Accès immédiat à votre dashboard." },
                { n: "02", title: "Lien de paiement", desc: "Générez votre lien unique. Montant fixe ou libre." },
                { n: "03", title: "Encaissement", desc: "Vos clients paient en un clic. L'argent arrive instantanément." },
              ].map((step) => (
                <div key={step.n} className="text-center">
                  <div className="relative mx-auto mb-4 sm:mb-6 w-14 h-14 sm:w-[72px] sm:h-[72px]">
                    <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-brand-500/[0.06] border border-brand-500/10" />
                    <div className="relative flex items-center justify-center h-full">
                      <span className="text-base sm:text-lg font-bold font-mono text-brand-400">{step.n}</span>
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-white mb-1.5 sm:mb-2">{step.title}</h3>
                  <p className="text-[12px] sm:text-[13px] text-zinc-500 leading-relaxed max-w-[240px] mx-auto">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 sm:py-32 lg:py-40">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[300px] sm:h-[400px] rounded-full bg-brand-500/[0.06] blur-[120px] sm:blur-[180px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-5 sm:px-6 text-center">
          <div className="mb-8 sm:mb-10 opacity-60">
            <Logo size="md" className="sm:hidden" />
            <Logo size="lg" className="hidden sm:flex" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight mb-4 sm:mb-6">
            Prêt à passer au
            <br />
            <span className="gradient-text">niveau supérieur</span> ?
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 mb-8 sm:mb-10 max-w-md mx-auto">
            Rejoignez une plateforme conçue pour les professionnels qui exigent l&apos;excellence.
          </p>
          <Link href="/register" className="inline-block w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 text-[14px] sm:text-[15px] font-semibold glow-md group">
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
          <p className="mt-4 sm:mt-5 text-[10px] sm:text-[11px] text-zinc-700">
            Inscription gratuite • Aucune carte requise • Accès immédiat
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/[0.03] py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:gap-8">
            <Logo size="sm" />
            <div className="flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-2 text-[11px] sm:text-[12px] text-zinc-600">
              <Link href="/legal" className="hover:text-zinc-400 transition-colors">Mentions légales</Link>
              <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Confidentialité</Link>
              <Link href="/cgv" className="hover:text-zinc-400 transition-colors">CGV</Link>
              <a href="mailto:support@yourazz.xyz" className="hover:text-zinc-400 transition-colors">Support</a>
            </div>
            <div className="h-[1px] w-full max-w-xs bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
            <p className="text-[10px] sm:text-[11px] text-zinc-800">
              &copy; {new Date().getFullYear()} YouRazz Official 公式 — Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
