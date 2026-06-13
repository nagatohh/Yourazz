import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCryptoAccessConfig, generatePaymentQr, isPaidPlan } from "@/lib/services/crypto-access";
import { CryptoPaymentClient } from "@/components/access/crypto-payment-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Paiement de l'abonnement — Yourazz",
  description: "Réglez votre abonnement Yourazz Pro ou Business en Litecoin (LTC).",
};

// Page de paiement d'un abonnement (Pro/Business) en Litecoin. Le plan vient
// du paramètre ?plan ; le QR est généré côté serveur (data URI autorisé par
// la CSP), l'adresse et le montant proviennent de la config d'environnement.
export default async function CryptoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { plan: planParam } = await searchParams;
  const plan = isPaidPlan((planParam || "").toUpperCase()) ? ((planParam as string).toUpperCase() as "PRO" | "BUSINESS") : "PRO";

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { plan: true, role: true },
  });

  const isAdmin = user?.role === "ADMIN" || user?.role === "ADMIN_OWNER";
  const currentPlan = user?.plan ?? "STARTER";

  const cfg = getCryptoAccessConfig(plan);
  const qr = await generatePaymentQr(cfg);

  return (
    <CryptoPaymentClient
      plan={plan}
      priceEur={cfg.priceEur}
      address={cfg.address}
      amount={cfg.amount}
      label={cfg.label}
      configured={cfg.configured}
      qr={qr}
      currentPlan={currentPlan}
      isAdmin={isAdmin}
    />
  );
}
