# Checklist de mise en production — Yourazz

## 1. Variables d'environnement (Vercel → Settings → Environment Variables)

- [ ] `DATABASE_URL` + `DIRECT_URL` — PostgreSQL production (SSL activé)
- [ ] `JWT_SECRET` — 64 caractères aléatoires, **différent du dev**
- [ ] `NEXT_PUBLIC_APP_URL` = `https://yourazz.xyz`
- [ ] `PAYMENT_PROVIDER` = `stripe` (⚠️ pas `mock`)
- [ ] `STRIPE_SECRET_KEY` — clé **live** (`sk_live_…`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — clé **live** (`pk_live_…`)
- [ ] `STRIPE_WEBHOOK_SECRET` — secret du endpoint webhook **production**
- [ ] `ENCRYPTION_KEY` — 64 hex, sauvegardé en lieu sûr (perte = IBAN illisibles)
- [ ] `ADMIN_EMAILS` — emails admin réels
- [ ] `CRON_SECRET` — protège `/api/cron/guardian`
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` — domaine vérifié dans Resend

## 2. Stripe

- [ ] Compte Stripe activé (mode live)
- [ ] Webhook créé : `https://yourazz.xyz/api/webhooks/stripe`
      Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`,
      `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`
- [ ] Apple Pay : domaine `yourazz.xyz` vérifié (Dashboard → Settings → Payment methods → Apple Pay → Add domain)
- [ ] Google Pay : activé dans les payment methods du Dashboard
- [ ] Paiement test réel de bout en bout (carte → succès → solde crédité → webhook reçu)

## 3. Base de données

- [ ] ⚠️ Le script de build contient `prisma db push --accept-data-loss`.
      C'est pratique mais **risqué** : un changement de schéma peut supprimer des données
      en production sans confirmation. À terme, migrer vers `prisma migrate deploy`.
- [ ] Backups automatiques activés chez l'hébergeur DB
- [ ] Connexion poolée (pgBouncer/Neon pooler) sur `DATABASE_URL`, directe sur `DIRECT_URL`

## 4. Vérifications fonctionnelles

- [ ] Inscription + vérification email
- [ ] Connexion / déconnexion
- [ ] Page `/pay/[slug]` : montant libre + montant fixe
- [ ] Apple Pay visible sur iPhone (Safari), Google Pay sur Android (Chrome)
- [ ] Consentement obligatoire avant paiement (les deux cases)
- [ ] Paiement carte → succès → reçu email → solde crédité
- [ ] Retrait vers IBAN (montant min 5 €)
- [ ] Export CSV des transactions
- [ ] Admin : stats, sync paiements, Chargeback Defender, export dossier preuve

## 5. Performance & mobile

- [ ] Lighthouse mobile ≥ 90 sur `/` et `/pay/[slug]`
- [ ] Test réel sur iPhone et Android (navigation, bottom nav, paiement)
- [ ] Vercel Analytics activé (optionnel : `npm i @vercel/analytics` + `<Analytics/>` dans le layout)

## 6. Sécurité

- [ ] `node scripts/guardian-check.ts` sans erreur critique
- [ ] Headers vérifiés sur https://securityheaders.com
- [ ] Aucune clé secrète exposée côté client (seules les `NEXT_PUBLIC_*` le sont)
- [ ] Test de connexion avec mauvais mot de passe ×6 → rate limit déclenché

## 7. Monitoring

- [ ] Cron Guardian actif (Vercel → Cron Jobs → `/api/cron/guardian` à 6h00)
- [ ] Alertes admin visibles dans `/admin/guardian`
- [ ] Page `/admin/webhooks` : tous les événements récents traités sans erreur
