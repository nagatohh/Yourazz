import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Remove duplicate null providerBankAccountId entries so the unique constraint can be dropped
  await db.$executeRawUnsafe(`
    DELETE FROM "BankAccount" WHERE "providerBankAccountId" IS NULL
  `);
  console.log("Cleaned bank accounts without provider ID");
}

main().catch(console.error).finally(() => db.$disconnect());
