import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCryptoAccessConfig, generatePaymentQr } from "@/lib/services/crypto-access";
import { CryptoPaymentClient } from "@/components/access/crypto-payment-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Paiement de l'accès — Yourazz",
  description: "Réglez votre accès Yourazz en Litecoin (LTC).",
};

// Page de paiement de l'accès en Litecoin. Le QR est généré côté serveur
// (data URI autorisé par la CSP), l'adresse et le montant proviennent de la
// configuration d'environnement.
export default async function CryptoAccessPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { accessStatus: true, role: true },
  });

  const isAdmin = user?.role === "ADMIN" || user?.role === "ADMIN_OWNER";
  const alreadyActive = isAdmin || user?.accessStatus === "ACTIVE";

  const cfg = getCryptoAccessConfig();
  const qr = await generatePaymentQr(cfg);

  return (
    <CryptoPaymentClient
      address={cfg.address}
      amount={cfg.amount}
      label={cfg.label}
      configured={cfg.configured}
      qr={qr}
      alreadyActive={alreadyActive}
    />
  );
}
