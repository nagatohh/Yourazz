/**
 * Grandfather : passe tous les comptes existants en accessStatus=ACTIVE.
 *
 * À exécuter UNE FOIS, après le db push qui ajoute la colonne accessStatus
 * et AVANT de déployer l'enforcement d'accès. Les comptes créés ensuite
 * naissent PENDING_PAYMENT et doivent payer leur abonnement Yourazz Access.
 *
 * Usage : npx tsx scripts/grandfather-access.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const cutoff = new Date();

  const result = await db.user.updateMany({
    where: {
      accessStatus: "PENDING_PAYMENT",
      createdAt: { lt: cutoff },
    },
    data: { accessStatus: "ACTIVE" },
  });

  await db.auditLog.create({
    data: {
      action: "ACCESS_GRANDFATHERED",
      metadata: { count: result.count, cutoff: cutoff.toISOString() },
    },
  });

  console.log(`✓ ${result.count} compte(s) existant(s) passé(s) en accessStatus=ACTIVE (cutoff: ${cutoff.toISOString()})`);
}

main()
  .catch((e) => {
    console.error("GRANDFATHER_ERROR:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
