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

## Yourazz Access (abonnement 29 EUR/mois) - ajout 2026-06-12

### Stripe
- [ ] Produit "Yourazz Access" (prod_UgvAP2adc4n5lE) + price lookup_key `yourazz_access_monthly` - CREES en live le 2026-06-12
- [ ] IMPORTANT : le endpoint webhook `https://yourazz.xyz/api/webhooks/stripe` doit recevoir les events :
      `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
      (Dashboard Stripe -> Developpeurs -> Webhooks -> endpoint -> "evenements ecoutes")
- [ ] Optionnel : `STRIPE_ACCESS_PRICE_ID` en env Vercel (sinon resolution auto par lookup_key)

### Flux d'acces
- Invitation (admin) -> inscription -> verification email -> `/access/payment` -> Stripe Checkout (subscription)
- Activation UNIQUEMENT par webhook (`checkout.session.completed` payment_status=paid, ou `invoice.paid`)
- `User.accessStatus` : PENDING_PAYMENT -> ACTIVE -> PAST_DUE/CANCELED (gere par webhook seulement)
- Comptes existants au 2026-06-12 : grandfathered ACTIVE (script `scripts/grandfather-access.ts`, deja execute)
- Admins : jamais soumis a l'abonnement

### Isolation financiere (verifications faites)
- [x] Inscription publique fermee (403), acces par invitation uniquement
- [x] Toutes les routes user filtrent par userId de session
- [x] Retrait : wallet interne = source de verite, debit atomique, transfer plateforme -> compte Connect du user, payout sur SON compte (`stripeAccount`), rollback par reversal en cas d'echec
- [x] Payout plateforme legacy neutralise (PLATFORM_PAYOUT_FORBIDDEN)
- [x] Un compte sans abonnement actif ne peut ni encaisser (pay/[slug], payments/create) ni retirer
- [x] Compte bancaire : ownership verifie (userId + compte Connect du user)

### Tests manuels a faire apres deploiement
1. Compte test : invitation -> inscription -> blocage dashboard -> paiement 29 EUR -> activation auto (webhook) -> dashboard OK
2. User A ne voit pas les transactions de User B (verifie par design : filtres userId)
3. Retrait : verifier transfer + payout dans le dashboard Stripe (Connect -> compte du user)
4. Annuler l'abonnement test -> accessStatus CANCELED -> dashboard bloque + lien de paiement public desactive
