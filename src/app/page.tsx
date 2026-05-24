"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe, CreditCard, Lock, Fingerprint, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useRef, useEffect, useState } from "react";

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseX.set((e.clientX - window.innerWidth / 2) * 0.02);
      mouseY.set((e.clientY - window.innerHeight / 2) * 0.02);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [mouseX, mouseY]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030308] overflow-hidden">
      {/* Navbar */}
      <motion.header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          scrolled ? "bg-[#030308]/90 backdrop-blur-2xl border-b border-white/[0.04]" : ""
        }`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 lg:px-8">
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
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                Connexion
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="relative overflow-hidden group">
                <span className="relative z-10 flex items-center gap-1.5">
                  Commencer
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[100dvh] flex items-center justify-center pt-[72px]">
        {/* Background layers */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            style={{ x: smoothX, y: smoothY }}
            className="absolute top-[15%] left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-brand-500/[0.07] blur-[180px]"
          />
          <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[100%] h-[1px] bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
          <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[60%] h-[80px] bg-brand-500/[0.06] blur-[60px]" />
          <div className="absolute top-[30%] left-[10%] h-[150px] w-[150px] rounded-full bg-purple-500/[0.04] blur-[80px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(225,29,72,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(225,29,72,0.015)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_30%,transparent_100%)]" />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto max-w-5xl px-6 text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
            </span>
            <span className="text-[12px] font-medium text-zinc-400 tracking-wide">Plateforme de paiement premium</span>
          </motion.div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-12"
          >
            <Logo size="xl" showTagline />
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
              Recevez vos paiements
              <br />
              <span className="gradient-text">instantanément</span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="mt-7 mx-auto max-w-xl text-base sm:text-lg text-zinc-500 leading-relaxed"
          >
            Un lien. Un clic. L&apos;argent arrive.
            <br className="hidden sm:block" />
            <span className="text-zinc-400">Carte, Apple Pay, Google Pay</span> — premium, sécurisé, instantané.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.1 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register">
              <Button size="lg" className="h-13 px-8 text-[15px] font-semibold glow-md group">
                Créer mon compte
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="h-13 px-8 text-[15px] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]">
                Découvrir
              </Button>
            </Link>
          </motion.div>

          {/* Trust */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {[
              { icon: Lock, text: "Chiffrement 256-bit" },
              { icon: Shield, text: "Conforme DSP2" },
              { icon: Fingerprint, text: "Auth sécurisée" },
            ].map((item) => (
              <span key={item.text} className="flex items-center gap-2 text-[11px] text-zinc-600 uppercase tracking-wider">
                <item.icon className="h-3 w-3 text-brand-500/50" />
                {item.text}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#030308] to-transparent pointer-events-none" />
      </section>

      {/* Features */}
      <section id="features" className="relative py-32 sm:py-40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-20"
          >
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/80 mb-4">
              Fonctionnalités
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Conçu pour performer
            </h2>
            <p className="mt-5 mx-auto max-w-md text-base text-zinc-500">
              Chaque détail est pensé pour offrir une expérience de paiement sans friction.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: CreditCard, title: "Multi-méthodes", desc: "Carte bancaire, Apple Pay, Google Pay — acceptez tous les moyens de paiement modernes en un clic." },
              { icon: Zap, title: "Instantané", desc: "L'argent arrive en temps réel sur votre wallet. Retirez vers votre IBAN quand vous voulez." },
              { icon: Shield, title: "Ultra-sécurisé", desc: "Chiffrement AES-256, conformité PSD2/DSP2, authentification forte. Vos fonds sont protégés." },
              { icon: Globe, title: "Lien universel", desc: "Un lien unique, partageable partout. Vos clients paient sans créer de compte." },
              { icon: Wallet, title: "Wallet intégré", desc: "Suivez vos revenus en temps réel. Historique complet, exports, analytics." },
              { icon: Fingerprint, title: "Identité vérifiée", desc: "Système d'invitation exclusif. Chaque membre est vérifié et approuvé." },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative p-7 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-500"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-brand-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="mb-5 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] group-hover:border-brand-500/20 group-hover:bg-brand-500/[0.05] transition-all duration-500">
                    <feature.icon className="h-[18px] w-[18px] text-zinc-400 group-hover:text-brand-400 transition-colors duration-500" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-[13px] text-zinc-500 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Pricing */}
      <section id="pricing" className="relative py-28">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand-500/[0.03] blur-[150px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/80 mb-4">
              Tarification
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Simple et transparent
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x sm:divide-white/[0.04]"
          >
            {[
              { value: "0€", label: "Inscription", sub: "Gratuit pour toujours" },
              { value: "1.5%", label: "Par transaction", sub: "Aucun frais caché" },
              { value: "Instant", label: "Crédité", sub: "En temps réel" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center px-8 py-6"
              >
                <p className="text-4xl sm:text-5xl font-black gradient-text mb-2">{stat.value}</p>
                <p className="text-sm font-medium text-white mb-1">{stat.label}</p>
                <p className="text-xs text-zinc-600">{stat.sub}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
            >
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/80 mb-4">
                Sécurité
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-6">
                Vos fonds sont
                <br />
                <span className="gradient-text">en sécurité absolue</span>
              </h2>
              <p className="text-base text-zinc-500 leading-relaxed mb-8">
                Infrastructure bancaire de niveau institutionnel. Chaque transaction est chiffrée, vérifiée et auditée en temps réel.
              </p>
              <div className="space-y-4">
                {[
                  "Chiffrement AES-256 bout en bout",
                  "Conformité PSD2 / DSP2 européenne",
                  "Authentification forte 3D Secure",
                  "Monitoring anti-fraude en temps réel",
                  "Audit trail complet de chaque opération",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    </div>
                    <span className="text-sm text-zinc-400">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-brand-500/[0.02] to-transparent" />
                <div className="relative space-y-5">
                  {[
                    { label: "Statut système", value: "Opérationnel", color: "text-emerald-400" },
                    { label: "Chiffrement", value: "AES-256-GCM", color: "text-white" },
                    { label: "Uptime", value: "99.99%", color: "text-white" },
                    { label: "Dernière vérification", value: "Il y a 2 min", color: "text-zinc-400" },
                    { label: "Certificat SSL", value: "Valide", color: "text-emerald-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                      <span className="text-[13px] text-zinc-500">{row.label}</span>
                      <span className={`text-[13px] font-medium font-mono ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-20"
          >
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/80 mb-4">
              Processus
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Trois étapes, c&apos;est tout
            </h2>
          </motion.div>

          <div className="relative">
            <div className="hidden sm:block absolute top-[52px] left-[16.5%] right-[16.5%] h-[1px] bg-gradient-to-r from-brand-500/20 via-brand-500/10 to-brand-500/20" />

            <div className="grid sm:grid-cols-3 gap-12 sm:gap-8">
              {[
                { n: "01", title: "Inscription", desc: "Créez votre compte en 30 secondes. Accès immédiat à votre dashboard premium." },
                { n: "02", title: "Lien de paiement", desc: "Générez votre lien unique. Montant fixe ou libre, personnalisable à l'infini." },
                { n: "03", title: "Encaissement", desc: "Vos clients paient en un clic. L'argent est sur votre wallet instantanément." },
              ].map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  className="text-center"
                >
                  <div className="relative mx-auto mb-6 w-[72px] h-[72px]">
                    <div className="absolute inset-0 rounded-2xl bg-brand-500/[0.06] border border-brand-500/10" />
                    <div className="relative flex items-center justify-center h-full">
                      <span className="text-lg font-bold font-mono text-brand-400">{step.n}</span>
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[240px] mx-auto">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 sm:py-40">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-brand-500/[0.06] blur-[180px]" />
          <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 w-[40%] h-[1px] bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-10 opacity-60">
              <Logo size="lg" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
              Prêt à passer au
              <br />
              <span className="gradient-text">niveau supérieur</span> ?
            </h2>
            <p className="text-base text-zinc-500 mb-10 max-w-md mx-auto">
              Rejoignez une plateforme conçue pour les professionnels qui exigent l&apos;excellence.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 text-[15px] font-semibold glow-md group">
                Commencer gratuitement
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <p className="mt-5 text-[11px] text-zinc-700">
              Inscription gratuite • Aucune carte requise • Accès immédiat
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/[0.03] py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8">
            <Logo size="sm" />
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12px] text-zinc-600">
              <Link href="/legal" className="hover:text-zinc-400 transition-colors">Mentions légales</Link>
              <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Confidentialité</Link>
              <Link href="/cgv" className="hover:text-zinc-400 transition-colors">CGV</Link>
              <a href="mailto:support@yourazz.xyz" className="hover:text-zinc-400 transition-colors">Support</a>
            </div>
            <div className="h-[1px] w-full max-w-xs bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
            <p className="text-[11px] text-zinc-800">
              &copy; {new Date().getFullYear()} YouRazz Official 公式 — Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
