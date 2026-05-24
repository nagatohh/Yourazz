"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe, CreditCard, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06060a] noise">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/25">
              <span className="text-sm font-bold text-white">Y</span>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">Yourazz</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Commencer
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-brand-500/[0.07] blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/[0.05] blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 h-[250px] w-[250px] rounded-full bg-blue-500/[0.04] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-zinc-400 backdrop-blur-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-400" />
            Plateforme de paiement nouvelle génération
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-7xl lg:text-8xl"
          >
            Recevez vos
            <br />
            <span className="gradient-text">paiements</span> en un clic
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="mx-auto mb-12 max-w-2xl text-lg text-zinc-400 leading-relaxed sm:text-xl"
          >
            Créez un lien, partagez-le, et recevez de l&apos;argent instantanément.
            Carte bancaire, Apple Pay, Google Pay — une expérience de paiement premium.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/register">
              <Button size="lg" className="text-base px-8">
                Créer mon compte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="text-base px-8">
                En savoir plus
              </Button>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="mt-16 flex items-center justify-center gap-8 text-xs text-zinc-600"
          >
            <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Chiffrement SSL</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> DSP2 / PSD2</span>
            <span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Stripe Certified</span>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-20 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-5xl tracking-tight">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mx-auto max-w-lg text-lg text-zinc-500">
              Une plateforme conçue pour les professionnels qui veulent
              se concentrer sur leur activité, pas sur la gestion des paiements.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CreditCard, title: "Multi-méthodes", desc: "Carte, Apple Pay, Google Pay — acceptez tous les moyens de paiement" },
              { icon: Zap, title: "Instantané", desc: "Paiements crédités en temps réel. Retirez quand vous voulez." },
              { icon: Shield, title: "Ultra-sécurisé", desc: "Chiffrement bancaire, conformité PSD2, audit trail complet" },
              { icon: Globe, title: "Lien universel", desc: "Un lien unique, partageable partout. Pas d'app à installer." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-brand-500/20 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-brand-500/[0.05]"
              >
                <div className="mb-4 inline-flex rounded-xl bg-brand-500/10 p-3 transition-colors group-hover:bg-brand-500/15">
                  <f.icon className="h-5 w-5 text-brand-400" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / Stats */}
      <section className="relative py-24 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid gap-8 sm:grid-cols-3 text-center"
          >
            <div>
              <p className="text-4xl font-bold gradient-text">1.5%</p>
              <p className="mt-2 text-sm text-zinc-500">Commission par transaction</p>
            </div>
            <div>
              <p className="text-4xl font-bold gradient-text">Instant</p>
              <p className="mt-2 text-sm text-zinc-500">Crédité en temps réel</p>
            </div>
            <div>
              <p className="text-4xl font-bold gradient-text">0€</p>
              <p className="mt-2 text-sm text-zinc-500">Aucun frais d&apos;inscription</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-brand-500/[0.06] blur-[150px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-6 text-3xl font-bold text-white sm:text-5xl tracking-tight">
              Prêt à simplifier vos paiements ?
            </h2>
            <p className="mb-10 text-lg text-zinc-500">
              Inscription gratuite. Commencez à recevoir des paiements en moins de 2 minutes.
            </p>
            <Link href="/register">
              <Button size="lg" className="text-base px-10">
                Créer mon compte gratuitement
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg gradient-brand flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">Y</span>
              </div>
              <span className="text-sm font-medium text-zinc-400">Yourazz</span>
            </div>
            <p className="text-xs text-zinc-600">&copy; 2024 Yourazz. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
