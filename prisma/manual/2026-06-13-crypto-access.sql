-- Migration additive : accès payant par Litecoin (CryptoPayment, ActivationKey,
-- ActivationLog). Appliquée manuellement via `prisma db execute` car la base
-- héberge aussi des tables d'une autre application (tb_*) qu'un `prisma db push`
-- supprimerait. Ce script n'ajoute que les nouveaux objets — aucun DROP.
-- Idempotent : peut être rejoué sans erreur.

-- ─── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "CryptoPaymentStatus" AS ENUM ('PENDING', 'RECEIVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ActivationKeyStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CryptoPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LTC',
    "address" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "amount" TEXT,
    "status" "CryptoPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CryptoPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActivationKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "userId" TEXT,
    "status" "ActivationKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "cryptoPaymentId" TEXT,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedByIp" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActivationKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActivationLog" (
    "id" TEXT NOT NULL,
    "keyId" TEXT,
    "userId" TEXT,
    "email" TEXT,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivationLog_pkey" PRIMARY KEY ("id")
);

-- ─── Index ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "CryptoPayment_userId_idx" ON "CryptoPayment"("userId");
CREATE INDEX IF NOT EXISTS "CryptoPayment_status_idx" ON "CryptoPayment"("status");
CREATE INDEX IF NOT EXISTS "CryptoPayment_createdAt_idx" ON "CryptoPayment"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CryptoPayment_currency_txid_key" ON "CryptoPayment"("currency", "txid");

CREATE UNIQUE INDEX IF NOT EXISTS "ActivationKey_key_key" ON "ActivationKey"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "ActivationKey_keyHash_key" ON "ActivationKey"("keyHash");
CREATE UNIQUE INDEX IF NOT EXISTS "ActivationKey_cryptoPaymentId_key" ON "ActivationKey"("cryptoPaymentId");
CREATE INDEX IF NOT EXISTS "ActivationKey_userId_idx" ON "ActivationKey"("userId");
CREATE INDEX IF NOT EXISTS "ActivationKey_status_idx" ON "ActivationKey"("status");
CREATE INDEX IF NOT EXISTS "ActivationKey_createdAt_idx" ON "ActivationKey"("createdAt");

CREATE INDEX IF NOT EXISTS "ActivationLog_keyId_idx" ON "ActivationLog"("keyId");
CREATE INDEX IF NOT EXISTS "ActivationLog_userId_idx" ON "ActivationLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivationLog_createdAt_idx" ON "ActivationLog"("createdAt");

-- ─── Clés étrangères ─────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "CryptoPayment" ADD CONSTRAINT "CryptoPayment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ActivationKey" ADD CONSTRAINT "ActivationKey_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ActivationKey" ADD CONSTRAINT "ActivationKey_cryptoPaymentId_fkey"
    FOREIGN KEY ("cryptoPaymentId") REFERENCES "CryptoPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ActivationLog" ADD CONSTRAINT "ActivationLog_keyId_fkey"
    FOREIGN KEY ("keyId") REFERENCES "ActivationKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
