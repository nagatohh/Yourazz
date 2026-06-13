-- Refonte abonnements : clés d'activation et paiements crypto typés par plan.
-- Additif uniquement, idempotent. Le type "PlanTier" existe déjà (User.plan).

-- Nouveaux statuts de clé : suspendue (admin) / expirée (auto).
ALTER TYPE "ActivationKeyStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "ActivationKeyStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- Plan associé à chaque clé et à chaque paiement crypto.
ALTER TABLE "ActivationKey"  ADD COLUMN IF NOT EXISTS "plan" "PlanTier" NOT NULL DEFAULT 'PRO';
ALTER TABLE "CryptoPayment"  ADD COLUMN IF NOT EXISTS "plan" "PlanTier" NOT NULL DEFAULT 'PRO';

-- Référence unique de commande (affichée à l'utilisateur).
ALTER TABLE "CryptoPayment"  ADD COLUMN IF NOT EXISTS "reference" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "CryptoPayment_reference_key" ON "CryptoPayment"("reference");
