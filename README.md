# Yourazz — Plateforme de paiement

Recevez, gérez et retirez vos paiements simplement. Liens de paiement, carte bancaire, Apple Pay, Google Pay, dashboard financier, retraits IBAN et protection anti-litige.

**Production :** [yourazz.xyz](https://yourazz.xyz)

## Stack

| Couche | Technologie |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components) |
| Langage | TypeScript strict |
| UI | Tailwind CSS, animations CSS légères (pas de framer-motion → bundle mobile réduit) |
| Base de données | PostgreSQL + Prisma |
| Paiements | Stripe (Payment Element + Express Checkout : Apple Pay / Google Pay) |
| Auth | JWT maison (jose) + middleware Next |
| Emails | Resend |
| Déploiement | Vercel (cron Guardian quotidien inclus) |

## Démarrage local

```bash
npm install
cp .env.example .env       # puis remplir les variables
npx prisma db push          # synchronise le schéma sur la DB
npm run dev                 # http://localhost:3000
```

Avec `PAYMENT_PROVIDER="mock"`, les paiements sont simulés — aucune clé Stripe requise en dev.

## Structure

```
src/
├── app/
│   ├── page.tsx               # Landing (Server Component)
│   ├── pay/[slug]/            # Page de paiement publique (SSR + îlot client)
│   ├── dashboard/             # Espace utilisateur (soldes, transactions, retraits, lien)
│   ├── admin/                 # Admin (stats, paiements, Chargeback Defender, Guardian…)
│   └── api/                   # Routes API (auth, paiements, webhooks, admin…)
├── components/
│   ├── checkout/              # PayFlow, StripeCheckout, consentement, récap sécurisé
│   ├── landing/               # Navbar, mockup dashboard
│   ├── layout/                # Sidebar, bottom nav mobile
│   └── ui/                    # Design system (Button, Card, Skeleton, EmptyState…)
└── lib/
    ├── payments/              # Abstraction fournisseur (stripe / payplug / mock)
    ├── services/              # Ledger, Chargeback Defender, Stripe Connect
    ├── guardian/              # Auto-monitoring (checks DB, Stripe, webhooks, wallets)
    └── auth/                  # Sessions JWT, guard admin
```

## Sécurité

- **Aucune donnée carte stockée** — tout transite par Stripe (PCI-DSS niveau 1).
- Signature des webhooks Stripe vérifiée (`stripe.webhooks.constructEvent`).
- Idempotency keys sur paiements et retraits.
- Rate limiting sur les routes sensibles (login, création de paiement, invitations).
- CSRF (vérification d'origine) + headers de sécurité via `middleware.ts`.
- IBAN chiffrés (AES) via `ENCRYPTION_KEY`.
- Logs de sécurité et d'audit en base.

## Chargeback Defender

Chaque paiement génère automatiquement un dossier de preuve : consentement explicite
(CGU + politique de remboursement, horodatés), IP, user-agent, confirmation webhook,
score de risque. En cas de litige Stripe, le dossier est exportable en un clic depuis
`/admin/chargeback-defender`.

## Déploiement Vercel

1. Importer le repo dans Vercel.
2. Renseigner les variables d'environnement (voir `.env.example`).
3. Le build exécute `prisma generate && prisma db push && next build` (voir `package.json`).
4. Configurer le webhook Stripe → `https://yourazz.xyz/api/webhooks/stripe`.
5. Suivre [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md) avant la mise en ligne.

## Scripts utiles

```bash
npm run db:studio          # Prisma Studio
npm run guardian:check     # Vérification santé système
npm run guardian:wallets   # Cohérence des wallets
npm run cleanup:pending    # Nettoyage des transactions en attente expirées
```
