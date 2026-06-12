import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Zap,
  Wallet,
  BarChart3,
  Banknote,
  FileCheck2,
  Gauge,
  BellRing,
  ServerOff,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { LandingNavbar } from "@/components/landing/navbar";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";
import {
  VisaLogo,
  MastercardLogo,
  ApplePayLogo,
  GooglePayLogo,
  CardGenericLogo,
} from "@/components/ui/payment-logos";

const faq = [
  {
    q: "Comment mes clients paient-ils ?",
    a: "Vous partagez votre lien de paiement (SMS, email, réseaux sociaux). Votre client l'ouvre, choisit carte bancaire, Apple Pay ou Google Pay, et paie en quelques secondes — sans créer de compte.",
  },
  {
    q: "Quand l'argent est-il disponible ?",
    a: "Le paiement est crédité immédiatement sur votre solde Yourazz. Après le délai de clearing bancaire (24 à 48 h), il devient disponible au retrait vers votre IBAN.",
  },
  {
    q: "Mes données bancaires sont-elles stockées ?",
    a: "Non. Les données de carte ne transitent jamais par nos serveurs : elles sont traitées directement par Stripe, certifié PCI-DSS niveau 1 — le plus haut niveau de sécurité de l'industrie.",
  },
  {
    q: "Que se passe-t-il en cas de litige ?",
    a: "Yourazz Chargeback Defender collecte automatiquement les preuves de chaque paiement (consentement, horodatage, confirmation de livraison) et constitue un dossier prêt à soumettre en cas de contestation.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Le plan Starter est gratuit (500 €/mois d'encaissement). Le plan Pro à 7,99 €/mois monte à 1 500 €/mois, et le Business à 19,99 €/mois offre un encaissement illimité. Les retraits vers votre IBAN sont gratuits sur tous les plans.",
  },
  {
    q: "Apple Pay et Google Pay sont-ils vraiment disponibles ?",
    a: "Oui. Ils s'affichent automatiquement sur la page de paiement dès que l'appareil de votre client les prend en charge (Safari/iPhone pour Apple Pay, Chrome/Android pour Google Pay).",
  },
];

const securityPoints = [
  {
    icon: Lock,
    title: "Paiements chiffrés",
    desc: "Chaque transaction est chiffrée (TLS + AES-256) et authentifiée 3D Secure 2.",
  },
  {
    icon: ShieldCheck,
    title: "Propulsé par Stripe",
    desc: "Infrastructure certifiée PCI-DSS niveau 1, utilisée par des millions d'entreprises.",
  },
  {
    icon: ServerOff,
    title: "Zéro stockage de carte",
    desc: "Vos données sensibles ne touchent jamais nos serveurs. Jamais.",
  },
  {
    icon: FileCheck2,
    title: "Protection anti-litige",
    desc: "Preuves de paiement collectées automatiquement pour chaque transaction.",
  },
];

const dashboardFeatures = [
  { icon: Wallet, title: "Solde en temps réel", desc: "Disponible et en attente, toujours à jour." },
  { icon: BarChart3, title: "Graphiques de revenus", desc: "Jour, semaine, mois — visualisez votre croissance." },
  { icon: Zap, title: "Transactions live", desc: "Chaque paiement apparaît instantanément." },
  { icon: Banknote, title: "Retraits en 1 clic", desc: "Vers votre IBAN, traités sous 2-3 jours ouvrés." },
];

const defenderFeatures = [
  {
    icon: FileCheck2,
    title: "Preuve de paiement",
    desc: "Consentement explicite, horodatage, IP et confirmation de livraison archivés pour chaque transaction.",
  },
  {
    icon: Gauge,
    title: "Score de risque",
    desc: "Chaque paiement est analysé et noté en temps réel. Les paiements à risque sont signalés avant qu'ils ne deviennent des litiges.",
  },
  {
    icon: ScrollText,
    title: "Dossier de preuve exportable",
    desc: "En cas de chargeback, exportez un dossier complet prêt à soumettre à Stripe en quelques secondes.",
  },
  {
    icon: BellRing,
    title: "Alertes instantanées",
    desc: "Litiges et paiements suspects déclenchent une alerte immédiate sur le dashboard admin.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400/90 mb-3 sm:mb-4">
      {children}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-x-hidden">
      <LandingNavbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-28 sm:pt-40 pb-16 sm:pb-24">
        {/* Fond statique — aucun JS */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[400px] w-[90%] sm:h-[600px] sm:w-[800px] rounded-full bg-[radial-gradient(ellipse_closest-side,rgba(220,38,38,0.11),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:60px_60px] sm:bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_30%,transparent_100%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6 text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-4 py-2 animate-fade-up">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
            </span>
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 tracking-wide">
              Plateforme de paiement en ligne
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05] animate-fade-up [animation-delay:100ms]">
            Recevez, gérez et retirez
            <br />
            <span className="gradient-text">vos paiements simplement.</span>
          </h1>

          <p className="mt-6 mx-auto max-w-xl text-sm sm:text-base lg:text-lg text-zinc-400 leading-relaxed animate-fade-up [animation-delay:200ms]">
            Un lien de paiement, tous les moyens de paiement.
            <br className="hidden sm:block" />
            Carte bancaire, Apple Pay, Google Pay — sécurisé par Stripe.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-fade-up [animation-delay:300ms]">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 sm:h-13 px-8 text-[14px] sm:text-[15px] font-semibold glow-md group">
                Ouvrir mon compte
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="#dashboard" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 sm:h-13 px-8 text-[14px] sm:text-[15px] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
              >
                Voir le dashboard
              </Button>
            </Link>
          </div>

          <p className="mt-5 text-[11px] text-zinc-600 animate-fade-up [animation-delay:400ms]">
            Inscription gratuite · Aucune carte requise · Accès immédiat
          </p>
        </div>

        {/* Mockup dashboard */}
        <div className="relative z-10 mt-14 sm:mt-20 px-5 sm:px-8 animate-fade-up [animation-delay:500ms]">
          <DashboardMockup />
        </div>
      </section>

      {/* ── Moyens de paiement ───────────────────────────────── */}
      <section id="payments" className="relative py-16 sm:py-24 border-t border-white/[0.03]">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 text-center">
          <SectionLabel>Moyens de paiement</SectionLabel>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Vos clients paient comme ils veulent
          </h2>
          <p className="mt-4 mx-auto max-w-md text-sm sm:text-base text-zinc-500">
            Tous les moyens de paiement modernes, détectés automatiquement selon l&apos;appareil. Aucune configuration.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <VisaLogo className="h-12 px-5" />
            <MastercardLogo className="h-12 px-5" />
            <ApplePayLogo className="h-12 px-5" />
            <GooglePayLogo className="h-12 px-5" />
            <CardGenericLogo className="h-12 px-5" />
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[
              { title: "Détection automatique", desc: "Apple Pay sur iPhone, Google Pay sur Android — le bon bouton s'affiche tout seul." },
              { title: "Paiement en un geste", desc: "Face ID, Touch ID ou empreinte : vos clients paient sans saisir leur carte." },
              { title: "3D Secure 2 intégré", desc: "Authentification forte conforme DSP2, gérée automatiquement par Stripe." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/[0.05] bg-white/[0.015] p-5">
                <h3 className="text-[14px] font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sécurité ─────────────────────────────────────────── */}
      <section id="security" className="relative py-16 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-[radial-gradient(circle_closest-side,rgba(220,38,38,0.06),transparent)]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div>
              <SectionLabel>Sécurité</SectionLabel>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-5">
                Conçu pour que vos clients
                <br />
                <span className="gradient-text">paient en confiance</span>
              </h2>
              <p className="text-sm sm:text-base text-zinc-500 leading-relaxed mb-8">
                Une page de paiement rassurante, une infrastructure bancaire éprouvée, et zéro donnée sensible
                stockée chez nous. La confiance de vos clients est votre meilleur taux de conversion.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {securityPoints.map((p) => (
                  <div key={p.title} className="flex gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/[0.08] border border-brand-500/15">
                      <p.icon className="h-4 w-4 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-white">{p.title}</h3>
                      <p className="mt-0.5 text-[12px] text-zinc-500 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl sm:rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-8 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
                <div className="relative space-y-3 sm:space-y-4">
                  {[
                    { label: "Statut système", value: "Opérationnel", color: "text-emerald-400" },
                    { label: "Processeur de paiement", value: "Stripe — PCI-DSS niveau 1", color: "text-white" },
                    { label: "Chiffrement", value: "TLS 1.3 / AES-256", color: "text-white" },
                    { label: "Authentification forte", value: "3D Secure 2 (DSP2)", color: "text-white" },
                    { label: "Stockage des cartes", value: "Aucun", color: "text-emerald-400" },
                    { label: "Protection anti-litige", value: "Active", color: "text-emerald-400" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 py-2 sm:py-2.5 border-b border-white/[0.04] last:border-0"
                    >
                      <span className="text-[12px] sm:text-[13px] text-zinc-500">{row.label}</span>
                      <span className={`text-right text-[12px] sm:text-[13px] font-medium font-mono ${row.color}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dashboard ────────────────────────────────────────── */}
      <section id="dashboard" className="relative py-16 sm:py-28 border-t border-white/[0.03]">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <SectionLabel>Dashboard</SectionLabel>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Votre activité, en un coup d&apos;œil
            </h2>
            <p className="mt-4 mx-auto max-w-md text-sm sm:text-base text-zinc-500">
              Soldes, revenus, transactions et retraits — tout est là, en temps réel, sur mobile comme sur desktop.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {dashboardFeatures.map((f) => (
              <div
                key={f.title}
                className="group relative p-5 sm:p-6 rounded-2xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] hover:border-brand-500/15 transition-colors duration-300"
              >
                <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] group-hover:border-brand-500/25 group-hover:bg-brand-500/[0.06] transition-colors duration-300">
                  <f.icon className="h-[18px] w-[18px] text-zinc-400 group-hover:text-brand-400 transition-colors duration-300" />
                </div>
                <h3 className="text-[14px] sm:text-[15px] font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-[12px] sm:text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chargeback Defender ──────────────────────────────── */}
      <section className="relative py-16 sm:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[700px] h-[300px] rounded-full bg-[radial-gradient(ellipse_closest-side,rgba(220,38,38,0.07),transparent)]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/[0.06] px-4 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
              <span className="text-[11px] sm:text-[12px] font-semibold text-brand-300 tracking-wide">
                YOURAZZ CHARGEBACK DEFENDER
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Les litiges, on s&apos;en occupe
              <br />
              <span className="gradient-text">avant qu&apos;ils n&apos;arrivent</span>
            </h2>
            <p className="mt-4 mx-auto max-w-lg text-sm sm:text-base text-zinc-500">
              Chaque paiement génère automatiquement son dossier de preuve. En cas de contestation,
              vous avez déjà tout ce qu&apos;il faut pour gagner.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {defenderFeatures.map((f) => (
              <div
                key={f.title}
                className="relative p-5 sm:p-7 rounded-2xl border border-white/[0.05] bg-gradient-to-b from-white/[0.025] to-transparent"
              >
                <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/[0.08] border border-brand-500/15">
                  <f.icon className="h-[18px] w-[18px] text-brand-400" />
                </div>
                <h3 className="text-[14px] sm:text-[15px] font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-[12px] sm:text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs ─────────────────────────────────────────────── */}
      <section id="pricing" className="relative py-16 sm:py-28 border-t border-white/[0.03]">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <SectionLabel>Tarifs</SectionLabel>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Simple et transparent
            </h2>
            <p className="mt-4 mx-auto max-w-md text-sm sm:text-base text-zinc-500">
              Commencez gratuitement, upgradez quand votre business grandit. Sans engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* Starter */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-7 flex flex-col">
              <div className="mb-5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Starter</p>
                <p className="text-3xl font-bold text-white">Gratuit</p>
                <p className="text-[13px] text-zinc-500 mt-1">500 &euro; / mois d&apos;encaissement</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {["Lien de paiement personnalisable", "Carte, Apple Pay, Google Pay", "Dashboard temps réel", "Retraits vers IBAN", "Chargeback Defender"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-zinc-400">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full">
                <Button variant="outline" className="w-full">Commencer gratuitement</Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border border-brand-500/25 bg-gradient-to-b from-brand-500/[0.06] to-transparent p-6 sm:p-7 flex flex-col">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Populaire
              </span>
              <div className="mb-5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-400 mb-2">Pro</p>
                <p className="text-3xl font-bold text-white">7,99 &euro;<span className="text-sm font-normal text-zinc-500"> /mois</span></p>
                <p className="text-[13px] text-zinc-500 mt-1">1 500 &euro; / mois d&apos;encaissement</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {["Tout le plan Starter", "Plafond 3x plus élevé", "Multi-devises (EUR, USD, GBP)", "Support prioritaire", "Logo personnalisé"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-zinc-400">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full">
                <Button className="w-full glow-md">Choisir Pro</Button>
              </Link>
            </div>

            {/* Business */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-7 flex flex-col">
              <div className="mb-5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Business</p>
                <p className="text-3xl font-bold text-white">19,99 &euro;<span className="text-sm font-normal text-zinc-500"> /mois</span></p>
                <p className="text-[13px] text-zinc-500 mt-1">Encaissement illimité</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {["Tout le plan Pro", "Aucun plafond mensuel", "Statistiques avancées", "Accompagnement dédié", "Accès API"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-zinc-400">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full">
                <Button variant="outline" className="w-full">Choisir Business</Button>
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] text-zinc-600">
            Tous les plans incluent Apple Pay, Google Pay, Chargeback Defender et les retraits sans frais.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="relative py-16 sm:py-28 border-t border-white/[0.03]">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Questions fréquentes
            </h2>
          </div>

          <div className="space-y-2.5">
            {faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-white/[0.05] bg-white/[0.015] open:bg-white/[0.03] open:border-white/[0.08] transition-colors"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[13px] sm:text-[14px] font-medium text-white [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-zinc-500 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[12px] sm:text-[13px] leading-relaxed text-zinc-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[300px] sm:h-[400px] rounded-full bg-[radial-gradient(ellipse_closest-side,rgba(220,38,38,0.10),transparent)]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-5 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight mb-5">
            Commencez à encaisser
            <br />
            <span className="gradient-text">dès aujourd&apos;hui</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 mb-9 max-w-md mx-auto">
            Créez votre compte, partagez votre lien, recevez votre premier paiement. C&apos;est aussi simple que ça.
          </p>
          <Link href="/register" className="inline-block w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-10 text-[14px] sm:text-[15px] font-semibold glow-md group">
              Ouvrir mon compte gratuitement
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="relative border-t border-white/[0.04] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <Logo size="sm" />
              <p className="mt-3 text-[12px] leading-relaxed text-zinc-600 max-w-[200px]">
                Plateforme de paiement en ligne. Recevez, gérez et retirez vos paiements simplement.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Produit</p>
              <ul className="space-y-2 text-[12px] text-zinc-600">
                <li><Link href="#payments" className="hover:text-zinc-300 transition-colors">Moyens de paiement</Link></li>
                <li><Link href="#dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link></li>
                <li><Link href="#security" className="hover:text-zinc-300 transition-colors">Sécurité</Link></li>
                <li><Link href="#pricing" className="hover:text-zinc-300 transition-colors">Tarifs</Link></li>
                <li><Link href="/register" className="hover:text-zinc-300 transition-colors">Créer un compte</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Légal</p>
              <ul className="space-y-2 text-[12px] text-zinc-600">
                <li><Link href="/mentions-legales" className="hover:text-zinc-300 transition-colors">Mentions légales</Link></li>
                <li><Link href="/confidentialite" className="hover:text-zinc-300 transition-colors">Confidentialité</Link></li>
                <li><Link href="/cgv" className="hover:text-zinc-300 transition-colors">CGV</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Support</p>
              <ul className="space-y-2 text-[12px] text-zinc-600">
                <li>
                  <a href="mailto:support@yourazz.xyz" className="hover:text-zinc-300 transition-colors">
                    support@yourazz.xyz
                  </a>
                </li>
                <li><Link href="/login" className="hover:text-zinc-300 transition-colors">Connexion</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 border-t border-white/[0.04] pt-7">
            <div className="flex items-center gap-2">
              <VisaLogo className="h-8 px-2.5" />
              <MastercardLogo className="h-8 px-2.5" />
              <ApplePayLogo className="h-8 px-2.5" />
              <GooglePayLogo className="h-8 px-2.5" />
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.05] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">Tous les systèmes opérationnels</span>
            </div>
            <p className="text-[11px] text-zinc-700">
              &copy; {new Date().getFullYear()} Yourazz — Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
