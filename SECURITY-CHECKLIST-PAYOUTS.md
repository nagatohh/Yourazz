# 🔒 Checklist de sécurité — Retraits Stripe Connect (Yourazz)

Vérification de l'isolation stricte « chaque vendeur ne retire que SON argent, jamais le solde plateforme ».
Chaque point indique **où** c'est garanti dans le code.

| # | Scénario d'attaque / invariant | Statut | Où c'est garanti |
|---|---|---|---|
| 1 | User A ne peut pas voir le compte bancaire de User B | ✅ | `api/bank-accounts/route.ts` GET → `where: { userId: s.userId }` |
| 2 | User A ne peut pas retirer le solde de User B | ✅ | `api/payouts/create` → `requireActiveAccess()` + wallet du user en session uniquement |
| 3 | User A ne peut pas utiliser le `stripeAccountId` de User B | ✅ | Le payout lit `user.stripeAccountId` (session), jamais un id du body |
| 4 | Un vendeur sans compte Connect ne peut pas retirer | ✅ | `if (!user.stripeAccountId) → 400` |
| 5 | Un vendeur avec `payouts_enabled = false` ne peut pas retirer | ✅ | `getAccountStatus().payoutsEnabled` vérifié avant payout |
| 6 | Un vendeur ne peut pas retirer plus que son solde | ✅ | Garde `wallet.availableBalance >= amount` + débit atomique `updateMany({ availableBalance: { gte } })` |
| 7 | Le payout est créé uniquement avec `stripeAccount: user.stripeConnectAccountId` | ✅ | `createConnectedPayout` → `stripe.payouts.create(..., { stripeAccount })` |
| 8 | Le solde affiché n'est jamais le solde plateforme | ✅ | `getConnectedBalance` → `balance.retrieve({}, { stripeAccount })` |
| 9 | Le webhook Stripe invalide est refusé | ✅ | `constructEvent` (double secret) → 401 + `SecurityLog` si signature KO |
| 10 | Le webhook déjà traité n'est pas rejoué | ✅ | `WebhookEvent.processed` vérifié avant traitement |
| 11 | Un double clic ne crée pas deux retraits | ✅ | `idempotencyKey` déterministe 30 s (DB unique + idempotency Stripe) |
| 12 | Payout plateforme interdit | ✅ | `StripePaymentProvider.createPayout` **throw** `PLATFORM_PAYOUT_FORBIDDEN` |
| 13 | Montant falsifié dans le body | ✅ | Validation Zod `amount.int().min(500)` + revérifié contre le solde serveur |
| 14 | Plan falsifié | ✅ | `user.plan` lu en base (jamais du client) ; modifié uniquement par webhook |
| 15 | Martèlement / scripting de l'endpoint | ✅ | `rateLimit(payout:userId:ip, 5, 5min)` |
| 16 | Retrait sans 2FA quand 2FA activé | ✅ | `totpEnabled` → code TOTP obligatoire |
| 17 | Plafond mensuel de retrait par plan | ✅ (nouveau) | `checkPayoutCap()` dans `api/payouts/create` |
| 18 | Pays/devise non supporté → message propre | ✅ (nouveau) | `isCountrySupported` / `isPayoutCurrencySupported` → `UNSUPPORTED_COUNTRY_MESSAGE` (422) |
| 19 | Pas d'IBAN complet / secret dans les logs | ✅ | `ibanMasked` + audit ne stocke que `last4` |
| 20 | Rollback si échec Stripe | ✅ | Reversal du transfer + re-crédit wallet + `GuardianLog` CRITICAL si reversal KO |

## ⚠️ Points d'attention / dette restante
- **Champs renommés** : le code utilise `stripeAccountId` (pas `stripeConnectAccountId`). Les nouveaux champs (`stripeChargesEnabled`, `bankAccountLast4`, etc.) sont **additifs**. Le renommage complet n'a pas été fait (migration risquée sur la prod).
- **Multi-devise wallet** : le ledger `Wallet` reste **EUR**. Les soldes Connect sont désormais lus multi-devises (`byCurrency`), mais le contrôle de retrait compare en EUR cents. Un IBAN non-EUR fonctionne via Stripe mais la cohérence ledger reste EUR.
- **Onboarding Custom** (pas Express) : l'IBAN est ajouté via API. Migration vers Express = chantier séparé (KYC délégué à Stripe).
- Lancer `npm run security:payouts` en CI pour bloquer toute régression des invariants 7/8/12.
