"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ value, suffix = "", prefix = "", duration = 2, active }: { value: number; suffix?: string; prefix?: string; duration?: number; active: boolean }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    let start = 0;
    const end = value;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); return; }
      setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [active, value, duration]);

  useEffect(() => {
    if (!active) { started.current = false; setCount(0); }
  }, [active]);

  return <span>{prefix}{count.toLocaleString("fr-FR")}{suffix}</span>;
}

// ─── Glow Button ──────────────────────────────────────────────────────────────
function GlowButton({ children, variant = "primary", onClick, size = "md" }: { children: React.ReactNode; variant?: "primary" | "secondary" | "outline"; onClick?: () => void; size?: "sm" | "md" }) {
  const base = `relative rounded-2xl font-semibold tracking-wide transition-all duration-300 overflow-hidden group cursor-pointer ${size === "sm" ? "px-5 py-2.5 text-xs" : "px-8 py-4 text-sm"}`;
  const variants = {
    primary: "bg-[#ff2d2d] text-white hover:bg-[#ff4545] hover:shadow-[0_0_60px_rgba(255,45,45,0.4)]",
    secondary: "bg-white/5 text-white border border-white/10 hover:border-[#ff2d2d]/50 hover:shadow-[0_0_40px_rgba(255,45,45,0.2)]",
    outline: "bg-transparent text-white border border-white/20 hover:border-white/40 hover:bg-white/5",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      <span className="relative z-10">{children}</span>
      {variant === "primary" && (
        <span className="absolute inset-0 bg-gradient-to-r from-[#ff2d2d] via-[#ff5555] to-[#ff2d2d] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
    </button>
  );
}

// ─── Slide transition variants ────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

// ─── SLIDE 1 — HERO ──────────────────────────────────────────────────────────
function HeroSlide({ active }: { active: boolean }) {
  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff2d2d]/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={active ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-8"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#ff2d2d] to-[#cc0000] shadow-[0_0_80px_rgba(255,45,45,0.5)]">
          <span className="text-3xl font-black text-white">Y</span>
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={active ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, delay: 0.3 }}
        className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter text-white mb-6"
      >
        YOUR<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b]">AZZ</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={active ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="text-xl sm:text-2xl text-zinc-400 font-light max-w-2xl mx-auto mb-12"
      >
        La nouvelle génération des paiements en ligne.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={active ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.9 }}
      >
        <GlowButton>Découvrir la plateforme</GlowButton>
      </motion.div>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#ff2d2d]/30"
            style={{ left: `${10 + (i * 6)}%`, top: `${20 + (i * 5) % 60}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── SLIDE 2 — LE PROBLÈME ───────────────────────────────────────────────────
function ProblemSlide({ active }: { active: boolean }) {
  const problems = [
    { icon: "💸", title: "Frais élevés", desc: "Les solutions actuelles prennent jusqu'à 5% sur chaque transaction." },
    { icon: "🧩", title: "Solutions compliquées", desc: "Des interfaces techniques réservées aux développeurs." },
    { icon: "🏦", title: "Limitations bancaires", desc: "Restrictions géographiques et délais de virement." },
    { icon: "🔧", title: "Outils dispersés", desc: "Jongler entre 5 plateformes pour gérer son activité." },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-4 block">Le problème</span>
          <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Les paiements en ligne sont <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b]">cassés.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {problems.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={active ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="relative p-7 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm group hover:border-[#ff2d2d]/20 transition-all duration-500"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#ff2d2d]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="text-3xl mb-3 block">{p.icon}</span>
              <h3 className="text-lg font-bold text-white mb-1">{p.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 3 — LA SOLUTION ───────────────────────────────────────────────────
function SolutionSlide({ active }: { active: boolean }) {
  const features = [
    { title: "Liens de paiement", icon: "🔗" },
    { title: "Dashboard temps réel", icon: "📊" },
    { title: "Gestion des paiements", icon: "💳" },
    { title: "Paiements Stripe", icon: "⚡" },
    { title: "Paiements Litecoin", icon: "₿" },
    { title: "Abonnements", icon: "🔄" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-4 block">La solution</span>
          <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight mb-4">
            Tout ce dont vous avez besoin.
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Yourazz unifie vos paiements, votre facturation et votre gestion client en une seule plateforme.
          </p>
        </motion.div>

        {/* Hub */}
        <div className="relative flex items-center justify-center min-h-[350px]">
          <motion.div
            initial={{ scale: 0 }}
            animate={active ? { scale: 1 } : {}}
            transition={{ duration: 0.6, type: "spring" }}
            className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-[#ff2d2d] to-[#cc0000] flex items-center justify-center shadow-[0_0_60px_rgba(255,45,45,0.4)]"
          >
            <span className="text-xl font-black text-white">Y</span>
          </motion.div>

          {features.map((f, i) => {
            const angle = (i / features.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 150;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={active ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                className="absolute"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm hover:border-[#ff2d2d]/30 transition-all cursor-pointer"
                >
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-[10px] text-zinc-300 font-medium whitespace-nowrap">{f.title}</span>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 4 — PAIEMENTS ─────────────────────────────────────────────────────
function PaymentsSlide({ active }: { active: boolean }) {
  const [tab, setTab] = useState<"stripe" | "crypto">("stripe");

  const items = tab === "stripe"
    ? [
        { icon: "💳", title: "Carte bancaire", desc: "Visa, Mastercard, Amex" },
        { icon: "", title: "Apple Pay", desc: "Paiement en un tap" },
        { icon: "🔵", title: "Google Pay", desc: "Rapide et sécurisé" },
      ]
    : [
        { icon: "Ł", title: "Litecoin (LTC)", desc: "Transfert instantané" },
        { icon: "📱", title: "QR Code", desc: "Scanner pour payer" },
        { icon: "🔒", title: "Validation sécurisée", desc: "Vérification on-chain" },
      ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <span className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-4 block">Paiements</span>
          <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Deux mondes. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b]">Une plateforme.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 1 } : {}}
          transition={{ delay: 0.3 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex bg-white/[0.03] rounded-2xl p-1.5 border border-white/[0.06]">
            <button onClick={() => setTab("stripe")} className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${tab === "stripe" ? "bg-[#ff2d2d] text-white shadow-[0_0_30px_rgba(255,45,45,0.3)]" : "text-zinc-400 hover:text-white"}`}>
              Carte & Wallets
            </button>
            <button onClick={() => setTab("crypto")} className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${tab === "crypto" ? "bg-[#ff2d2d] text-white shadow-[0_0_30px_rgba(255,45,45,0.3)]" : "text-zinc-400 hover:text-white"}`}>
              Crypto
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center group hover:border-[#ff2d2d]/20 transition-all duration-500"
              >
                <span className="text-5xl mb-4 block">{item.icon}</span>
                <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                <p className="text-zinc-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── SLIDE 5 — ABONNEMENTS ───────────────────────────────────────────────────
function PricingSlide({ active }: { active: boolean }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const plans = [
    { name: "Starter", price: "0", period: "Gratuit", accent: false, features: ["Lien de paiement", "Dashboard basique", "Support standard", "Plafond 500 €/mois"], limits: "500 €/mois maximum" },
    { name: "Pro", price: "7,99", period: "/mois", accent: true, features: ["Tout le plan Starter", "Support prioritaire", "Multi-devises (EUR, USD, GBP)", "Logo personnalisé", "Plafond 1 500 €/mois"], limits: "1 500 €/mois maximum" },
    { name: "Business", price: "19,99", period: "/mois", accent: false, features: ["Tout le plan Pro", "Encaissement illimité", "API complète", "Statistiques avancées", "Accompagnement dédié"], limits: "Aucune limite" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-4 block">Abonnements</span>
          <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">Un plan pour chaque ambition.</h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={active ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }}
              whileHover={{ y: -6 }}
              onClick={() => setExpanded(expanded === i ? null : i)}
              className={`relative p-7 rounded-3xl border cursor-pointer transition-all duration-500 ${plan.accent ? "bg-gradient-to-b from-[#ff2d2d]/10 to-transparent border-[#ff2d2d]/30 shadow-[0_0_60px_rgba(255,45,45,0.1)]" : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"}`}
            >
              {plan.accent && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ff2d2d] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full">Populaire</span>}
              <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-black text-white">{plan.price}€</span>
                <span className="text-zinc-500 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2.5">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${plan.accent ? "bg-[#ff2d2d]/20 text-[#ff2d2d]" : "bg-white/5 text-zinc-400"}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <AnimatePresence>
                {expanded === i && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-5 pt-5 border-t border-white/[0.06]">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Limite</p>
                    <p className="text-sm text-zinc-300">{plan.limits}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 6 — ACTIVATION ────────────────────────────────────────────────────
function ActivationSlide({ active }: { active: boolean }) {
  const steps = [
    { num: "01", title: "Choix du plan", desc: "Sélectionnez votre abonnement" },
    { num: "02", title: "Paiement", desc: "Carte ou Litecoin" },
    { num: "03", title: "Validation", desc: "Confirmation instantanée" },
    { num: "04", title: "Clé d'activation", desc: "Reçue immédiatement" },
    { num: "05", title: "Accès instantané", desc: "Votre compte est prêt" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <span className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-4 block">Activation</span>
          <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">
            5 étapes. <span className="text-zinc-500">Zéro friction.</span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#ff2d2d]/50 via-[#ff2d2d]/20 to-transparent hidden sm:block" />
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={active ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                className="relative flex items-center gap-6 group"
              >
                <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center group-hover:border-[#ff2d2d]/30 group-hover:shadow-[0_0_30px_rgba(255,45,45,0.15)] transition-all duration-500">
                  <span className="text-sm font-bold text-[#ff2d2d]">{step.num}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{step.title}</h3>
                  <p className="text-sm text-zinc-500">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 7 — SÉCURITÉ ─────────────────────────────────────────────────────
function SecuritySlide({ active }: { active: boolean }) {
  const features = [
    { icon: "🔐", title: "Chiffrement AES-256", desc: "Données chiffrées de bout en bout" },
    { icon: "🛡️", title: "Anti-fraude", desc: "Détection temps réel des menaces" },
    { icon: "✅", title: "Vérification", desc: "3D Secure + on-chain crypto" },
    { icon: "🔑", title: "Permissions", desc: "Contrôle d'accès granulaire" },
    { icon: "🎫", title: "Clés uniques", desc: "Non réutilisables et sécurisées" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-4 block">Sécurité</span>
          <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Conçu pour la <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b]">confiance.</span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute inset-0 bg-[#ff2d2d]/[0.02] rounded-[40px] blur-3xl" />
          <div className="relative grid grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={active ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-[#ff2d2d]/20 transition-all duration-500 text-center group"
              >
                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-300">{f.icon}</span>
                <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                <p className="text-zinc-500 text-[11px] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 8 — DASHBOARD ─────────────────────────────────────────────────────
function DashboardSlide({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <span className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-4 block">Dashboard</span>
          <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Tout voir. <span className="text-zinc-500">En temps réel.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative rounded-3xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-2xl"
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff2d2d]" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            <span className="ml-3 text-[10px] text-zinc-600">yourazz.xyz/dashboard</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Revenus", value: 12847, suffix: " €", color: "text-emerald-400" },
                { label: "Paiements", value: 384, suffix: "", color: "text-blue-400" },
                { label: "Activations", value: 67, suffix: "", color: "text-purple-400" },
                { label: "Taux de succès", value: 98, suffix: "%", color: "text-[#ff2d2d]" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={active ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <p className="text-[10px] text-zinc-500 mb-0.5">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>
                    <Counter value={stat.value} suffix={stat.suffix} active={active} />
                  </p>
                </motion.div>
              ))}
            </div>
            <div className="h-36 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-end justify-between px-4 pb-4 gap-1.5">
              {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={active ? { height: `${h}%` } : { height: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 + i * 0.05, ease: "easeOut" }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-[#ff2d2d]/60 to-[#ff2d2d]/20"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── SLIDE 9 — POURQUOI YOURAZZ ──────────────────────────────────────────────
function WhySlide({ active }: { active: boolean }) {
  const reasons = [
    { title: "Simple", desc: "Interface épurée, zéro complexité.", vs: "vs Interfaces techniques" },
    { title: "Rapide", desc: "Mise en place en 2 minutes.", vs: "vs Processus de 48h" },
    { title: "Moderne", desc: "Design premium, tech de pointe.", vs: "vs Outils 2010" },
    { title: "Crypto friendly", desc: "Litecoin natif.", vs: "vs Carte uniquement" },
    { title: "Évolutif", desc: "Du gratuit au Business, sans migration.", vs: "vs Changement plateforme" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-4 block">Pourquoi Yourazz</span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Pas juste une alternative. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b]">Une révolution.</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {reasons.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={active ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              whileHover={{ x: 6 }}
              className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-[#ff2d2d]/20 transition-all duration-500 group"
            >
              <div className="flex items-center gap-5">
                <span className="text-[#ff2d2d] text-xl font-black">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-base font-bold text-white">{r.title}</h3>
                  <p className="text-xs text-zinc-500">{r.desc}</p>
                </div>
              </div>
              <span className="hidden sm:block text-[11px] text-zinc-600 group-hover:text-[#ff2d2d]/60 transition-colors">{r.vs}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 10 — VISION ───────────────────────────────────────────────────────
function VisionSlide({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#ff2d2d]/[0.05] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.span
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="text-[#ff2d2d] text-sm font-semibold tracking-widest uppercase mb-8 block"
        >
          Notre vision
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-8"
        >
          Yourazz n&apos;est pas seulement une plateforme de paiement.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl text-zinc-400 font-light leading-relaxed"
        >
          C&apos;est un écosystème pensé pour permettre à chacun de{" "}
          <span className="text-white font-medium">créer</span>,{" "}
          <span className="text-white font-medium">vendre</span> et{" "}
          <span className="text-white font-medium">développer</span> son activité sans friction.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-14 flex justify-center gap-12 flex-wrap"
        >
          {[
            { value: 1.5, suffix: "%", label: "Frais par transaction" },
            { value: 3, suffix: " plans", label: "Pour chaque niveau" },
            { value: 2, suffix: " min", label: "Pour démarrer" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-white">
                <Counter value={stat.value} suffix={stat.suffix} active={active} />
              </p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─── SLIDE 11 — CTA ──────────────────────────────────────────────────────────
function CTASlide({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#ff2d2d]/[0.08] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={active ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.8, type: "spring" }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#ff2d2d] to-[#cc0000] shadow-[0_0_80px_rgba(255,45,45,0.5)] mb-8"
        >
          <span className="text-3xl font-black text-white">Y</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight mb-6"
        >
          Prêt à rejoindre<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b]">Yourazz</span> ?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg text-zinc-400 mb-12 max-w-lg mx-auto"
        >
          Rejoignez la nouvelle génération de créateurs qui encaissent sans limites.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={active ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <GlowButton variant="primary" onClick={() => window.open("https://yourazz.xyz/register", "_blank")}>
            Commencer gratuitement
          </GlowButton>
          <GlowButton variant="secondary" onClick={() => window.open("https://yourazz.xyz/dashboard/plan", "_blank")}>
            Passer en Pro
          </GlowButton>
          <GlowButton variant="outline" onClick={() => window.open("https://yourazz.xyz/dashboard/plan", "_blank")}>
            Découvrir Business
          </GlowButton>
        </motion.div>
      </div>
    </div>
  );
}

// ─── MAIN SLIDESHOW ──────────────────────────────────────────────────────────
const SLIDES = [
  { id: "hero", label: "Accueil", component: HeroSlide },
  { id: "problem", label: "Problème", component: ProblemSlide },
  { id: "solution", label: "Solution", component: SolutionSlide },
  { id: "payments", label: "Paiements", component: PaymentsSlide },
  { id: "pricing", label: "Abonnements", component: PricingSlide },
  { id: "activation", label: "Activation", component: ActivationSlide },
  { id: "security", label: "Sécurité", component: SecuritySlide },
  { id: "dashboard", label: "Dashboard", component: DashboardSlide },
  { id: "why", label: "Pourquoi", component: WhySlide },
  { id: "vision", label: "Vision", component: VisionSlide },
  { id: "cta", label: "Rejoindre", component: CTASlide },
];

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isAnimating || index === current) return;
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
    setIsAnimating(true);
  }, [current, isAnimating]);

  const next = useCallback(() => { if (current < SLIDES.length - 1) goTo(current + 1); }, [current, goTo]);
  const prev = useCallback(() => { if (current > 0) goTo(current - 1); }, [current, goTo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; };
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    };
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => { window.removeEventListener("touchstart", handleTouchStart); window.removeEventListener("touchend", handleTouchEnd); };
  }, [next, prev]);

  const SlideComponent = SLIDES[current].component;

  return (
    <main className="bg-[#050505] h-screen w-screen overflow-hidden relative select-none">
      {/* Slide content */}
      <AnimatePresence initial={false} custom={direction} onExitComplete={() => setIsAnimating(false)}>
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          <SlideComponent active={true} />
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className={`absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] hover:border-[#ff2d2d]/30 transition-all duration-300 ${current === 0 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button
        onClick={next}
        className={`absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] hover:border-[#ff2d2d]/30 transition-all duration-300 ${current === SLIDES.length - 1 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>

      {/* Bottom nav dots + labels */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5">
        {SLIDES.map((slide, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="group relative flex flex-col items-center"
            title={slide.label}
          >
            <span className={`block rounded-full transition-all duration-300 ${i === current ? "w-8 h-2 bg-[#ff2d2d] shadow-[0_0_12px_rgba(255,45,45,0.5)]" : "w-2 h-2 bg-white/20 hover:bg-white/40"}`} />
          </button>
        ))}
      </div>

      {/* Slide counter */}
      <div className="absolute top-6 right-6 sm:right-8 z-50 text-xs text-zinc-600 font-mono">
        {String(current + 1).padStart(2, "0")} / {SLIDES.length}
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-6 right-6 sm:right-8 z-50 hidden sm:flex items-center gap-2 text-[10px] text-zinc-600">
        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.08]">←</kbd>
        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.08]">→</kbd>
        <span>naviguer</span>
      </div>
    </main>
  );
}
