-- Migration ADDITIVE — champs Stripe Connect sur User (2026-06-16)
-- Contexte : la base Supabase est PARTAGÉE avec d'autres tables (tb_*).
-- NE JAMAIS faire `prisma db push` ici (il supprimerait ces tables).
-- Appliquer ce script tel quel dans le SQL Editor Supabase (ou via
-- `prisma db execute --file prisma/manual/2026-06-16-connect-fields.sql --schema prisma/schema.prisma`).
--
-- 100% additif et idempotent (IF NOT EXISTS) : aucune perte de données,
-- rejouable sans risque. Les colonnes existantes (stripeAccountId,
-- stripeOnboarded, payoutsEnabled) ne sont PAS touchées.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripeConnectStatus"    TEXT    NOT NULL DEFAULT 'not_created',
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripeCountry"          TEXT,
  ADD COLUMN IF NOT EXISTS "stripeDefaultCurrency"  TEXT,
  ADD COLUMN IF NOT EXISTS "payoutsDisabledReason"  TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountLast4"       TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountCountry"     TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountCurrency"    TEXT;

-- Optionnel : aligner stripeConnectStatus pour les comptes Connect déjà créés
-- (ceux qui ont un stripeAccountId mais sont encore au défaut 'not_created').
-- Le webhook account.updated réécrira la valeur exacte au prochain évènement.
UPDATE "User"
   SET "stripeConnectStatus" = 'active'
 WHERE "stripeAccountId" IS NOT NULL
   AND "payoutsEnabled" = true
   AND "stripeConnectStatus" = 'not_created';

UPDATE "User"
   SET "stripeConnectStatus" = 'pending_onboarding'
 WHERE "stripeAccountId" IS NOT NULL
   AND "payoutsEnabled" = false
   AND "stripeConnectStatus" = 'not_created';
