# Checklist de mise en production â€” Yourazz

## 1. Variables d'environnement (Vercel â†’ Settings â†’ Environment Variables)

- [ ] `DATABASE_URL` + `DIRECT_URL` â€” PostgreSQL production (SSL activÃ©)
- [ ] `JWT_SECRET` â€” 64 caractÃ¨res alÃ©atoires, **diffÃ©rent du dev**
- [ ] `NEXT_PUBLIC_APP_URL` = `https://yourazz.xyz`
- [ ] `PAYMENT_PROVIDER` = `stripe` (âš ï¸ pas `mock`)
- [ ] `STRIPE_SECRET_KEY` â€” clÃ© **live** (`sk_live_â€¦`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` â€” clÃ© **live** (`pk_live_â€¦`)
- [ ] `STRIPE_WEBHOOK_SECRET` â€” secret du endpoint webhook **production**
- [ ] `ENCRYPTION_KEY` â€” 64 hex, sauvegardÃ© en lieu sÃ»r (perte = IBAN illisibles)
- [ ] `ADMIN_EMAILS` â€” emails admin rÃ©els
- [ ] `CRON_SECRET` â€” protÃ¨ge `/api/cron/guardian`
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` â€” domaine vÃ©rifiÃ© dans Resend

## 2. Stripe

- [ ] Compte Stripe activÃ© (mode live)
- [ ] Webhook crÃ©Ã© : `https://yourazz.xyz/api/webhooks/stripe`
      Ã‰vÃ©nements : `payment_intent.succeeded`, `payment_intent.payment_failed`,
      `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`
- [ ] Apple Pay : domaine `yourazz.xyz` vÃ©rifiÃ© (Dashboard â†’ Settings â†’ Payment methods â†’ Apple Pay â†’ Add domain)
- [ ] Google Pay : activÃ© dans les payment methods du Dashboard
- [ ] Paiement test rÃ©el de bout en bout (carte â†’ succÃ¨s â†’ solde crÃ©ditÃ© â†’ webhook reÃ§u)

## 3. Base de donnÃ©es

- [ ] âš ï¸ Le script de build contient `prisma db push --accept-data-loss`.
      C'est pratique mais **risquÃ©** : un changement de schÃ©ma peut supprimer des donnÃ©es
      en production sans confirmation. Ã€ terme, migrer vers `prisma migrate deploy`.
- [ ] Backups automatiques activÃ©s chez l'hÃ©bergeur DB
- [ ] Connexion poolÃ©e (pgBouncer/Neon pooler) sur `DATABASE_URL`, directe sur `DIRECT_URL`

## 4. VÃ©rifications fonctionnelles

- [ ] Inscription + vÃ©rification email
- [ ] Connexion / dÃ©connexion
- [ ] Page `/pay/[slug]` : montant libre + montant fixe
- [ ] Apple Pay visible sur iPhone (Safari), Google Pay sur Android (Chrome)
- [ ] Consentement obligatoire avant paiement (les deux cases)
- [ ] Paiement carte â†’ succÃ¨s â†’ reÃ§u email â†’ solde crÃ©ditÃ©
- [ ] Retrait vers IBAN (montant min 5 â‚¬)
- [ ] Export CSV des transactions
- [ ] Admin : stats, sync paiements, Chargeback Defender, export dossier preuve

## 5. Performance & mobile

- [ ] Lighthouse mobile â‰¥ 90 sur `/` et `/pay/[slug]`
- [ ] Test rÃ©el sur iPhone et Android (navigation, bottom nav, paiement)
- [ ] Vercel Analytics activÃ© (optionnel : `npm i @vercel/analytics` + `<Analytics/>` dans le layout)

## 6. SÃ©curitÃ©

- [ ] `node scripts/guardian-check.ts` sans erreur critique
- [ ] Headers vÃ©rifiÃ©s sur https://securityheaders.com
- [ ] Aucune clÃ© secrÃ¨te exposÃ©e cÃ´tÃ© client (seules les `NEXT_PUBLIC_*` le sont)
- [ ] Test de connexion avec mauvais mot de passe Ã—6 â†’ rate limit dÃ©clenchÃ©

## 7. Monitoring

- [ ] Cron Guardian actif (Vercel â†’ Cron Jobs â†’ `/api/cron/guardian` Ã  6h00)
- [ ] Alertes admin visibles dans `/admin/guardian`
- [ ] Page `/admin/webhooks` : tous les Ã©vÃ©nements rÃ©cents traitÃ©s sans erreur

## Yourazz Access (abonnement 7,99 EUR/mois) - ajout 2026-06-12

### Stripe
- [ ] Produit "Yourazz Access" (prod_UgvAP2adc4n5lE, price actif 7,99 EUR price_1ThXc2AhbrFP9Moj91oqP72B) + lookup_key `yourazz_access_monthly` - CREES en live le 2026-06-12
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
1. Compte test : invitation -> inscription -> blocage dashboard -> paiement 7,99 EUR -> activation auto (webhook) -> dashboard OK
2. User A ne voit pas les transactions de User B (verifie par design : filtres userId)
3. Retrait : verifier transfer + payout dans le dashboard Stripe (Connect -> compte du user)
4. Annuler l'abonnement test -> accessStatus CANCELED -> dashboard bloque + lien de paiement public desactive


### Webhook comptes connectes - ajout 2026-06-12
- [x] Destination Connect creee (we_1ThY1hPNsBg1CSSvyxIvWmE7) : payout.*, account.updated, account.external_account.*
- [x] STRIPE_CONNECT_WEBHOOK_SECRET ajoute en env Vercel production
- Le endpoint /api/webhooks/stripe accepte les deux signatures (plateforme + connect)
- payout.paid -> ledger confirmPayout ; payout.failed/canceled -> failPayout (wallet re-credite) + reversal du transfer
