# Sécurité — Yourazz

Document de référence pour comprendre et **maintenir** la sécurité de la plateforme.
Principe directeur : **toute décision de sécurité est prise côté serveur**. Le frontend
n'accorde jamais seul l'accès à une fonctionnalité payante — il ne fait qu'afficher.

Pour vérifier rapidement les invariants : `npm run security:check`.

---

## 1. Authentification & sessions

| Mesure | Implémentation |
| --- | --- |
| Mots de passe hashés | `bcrypt` coût 12 — `src/lib/auth/index.ts` (`hashPassword`/`verifyPassword`). Jamais stockés ni journalisés en clair. |
| Sessions signées | JWT HS256 (`jose`), cookie `session` **HttpOnly + Secure (prod) + SameSite=lax**, 7 j — `createSession`. |
| Pas d'énumération de comptes | Login renvoie le même message pour « email inconnu » et « mauvais mot de passe ». |
| 2FA (TOTP) | `src/lib/totp.ts` — secret chiffré AES-256-GCM, codes de secours hashés. Exigé au login et avant chaque retrait. |
| **2FA admin obligatoire** | `src/app/admin/layout.tsx` : un admin sans 2FA est redirigé vers `/dashboard/security` et ne peut pas accéder au panneau. |
| Déconnexion forcée | `/api/auth/force-logout` efface le cookie sur 401. |

## 2. Anti brute-force & rate limiting

- **Login** : 5 essais/min par IP **+** verrouillage de compte 15 min après 5 échecs (`rateLimitByAccount`) → `src/app/api/auth/sign-in/route.ts`.
- **Activation de clé** : 8 essais/min par (compte+IP) → `src/app/api/access/activate/route.ts`.
- **Paiement / intent** : 10/min par IP. **Inscription par invitation** : 5/5 min. **Checkout plan** : 5/min.
- Implémentation : `src/lib/rate-limit.ts` (fenêtre glissante en mémoire).
- ⚠️ **Limite connue** : le store est en mémoire → **par instance** serverless (non partagé entre lambdas, remis à zéro au cold start). Pour un durcissement fort, migrer vers un store partagé (Upstash Redis). Voir §11.

## 3. Validation des entrées & injections

- **Toutes** les routes valident le corps avec **Zod** (`src/lib/validators`) avant tout traitement.
- **SQL injection** : aucun SQL brut côté application — **Prisma** (requêtes paramétrées) partout.
- **XSS** : React échappe par défaut ; aucun `dangerouslySetInnerHTML` sur des données utilisateur. CSP active (§7).
- **Injection de commandes** : aucune exécution shell à partir d'entrées utilisateur.
- **CSRF** : le middleware refuse les mutations (`POST/PUT/PATCH/DELETE`) dont l'`Origin` ≠ `Host` (hors webhooks), combiné à `SameSite=lax` — `src/middleware.ts`.
- **Upload de logo** : `logoUrl` doit être une URL `https://` validée (pas de `javascript:`/`data:`).

## 3.b Permissions par rôle & par plan (non contournables côté client)

- **Rôles** : `getAdminSession` / `getOwnerSession` (`src/lib/auth/admin.ts`) revérifient le rôle **en base** à chaque appel (un rôle révoqué est immédiatement effectif). Toutes les routes `/api/admin/*` les appellent.
- **Panneau admin** : garde serveur dans `src/app/admin/layout.tsx` (session + rôle + compte actif + 2FA) — défense en profondeur en plus du contrôle API.
- **Features payantes vérifiées côté serveur** (`src/lib/services/permissions.ts`, `hasFeature`) :
  - **Multi-devises (USD/GBP)** : bloqué pour Starter dans `src/app/api/payments/create-intent/route.ts`.
  - **Logo / couleur personnalisés** : bloqués pour Starter dans `src/app/api/payment-link/route.ts`.
  - **Plafond d'encaissement mensuel** : `checkPlanCap` appliqué à chaque paiement.
- Le frontend masque les options non disponibles, mais **même un appel API forgé est refusé**.

## 4. Paiements Stripe

- **Webhooks signés** : `stripe.webhooks.constructEvent` avec vérification de signature (deux secrets : compte + Connect) — `src/app/api/webhooks/stripe/route.ts`. Signature invalide → 401 + `SecurityLog`.
- **Idempotence** : table `WebhookEvent` (un évènement traité une seule fois).
- **Activation de plan uniquement par webhook** : `User.plan` / `accessStatus` ne sont jamais modifiés depuis une redirection `success_url` (forgeable) — seulement par évènement Stripe signé (`src/lib/services/access.ts`).
- **Montant = plan** : Stripe facture le `price` du plan choisi (metadata `plan`) ; le webhook applique exactement ce plan via `resolvePlanFromPriceId`.

## 5. Paiements Litecoin & clés d'activation

- **Vérification on-chain stricte avant émission de clé** (`src/lib/services/ltc-verify.ts`, branchée dans la confirmation admin) :
  1. la transaction **existe** (anti-faux-TXID) ;
  2. elle **paie l'adresse** de réception attendue ;
  3. pour un **montant ≥ au prix du plan** (`LTC_PRICE_PRO/BUSINESS`, tolérance 0,5 %) ;
  4. avec ≥ `LTC_MIN_CONFIRMATIONS` confirmations.
- Un échec **bloque** la confirmation (HTTP 422). L'admin peut overrider explicitement (bouton « confirmer quand même ») — chaque override est tracé (`CRYPTO_VERIFICATION_OVERRIDDEN`).
- **Anti-rejeu TXID** : contrainte unique `(currency, txid)` — un même TXID ne peut servir qu'une fois, tous comptes confondus.
- **Clés d'activation** :
  - Générées par `crypto.randomBytes` (imprévisibles), préfixées par plan (`PRO-…` / `BUSINESS-…`).
  - Stockées avec un **hash SHA-256** (`keyHash`, recherche à la validation) ; `key` lisible visible uniquement de l'admin.
  - **Usage unique atomique** : `updateMany where status=ACTIVE` (deux requêtes concurrentes ne peuvent pas consommer la même clé).
  - **Typage strict** : une clé `PRO` n'active que Pro, une clé `BUSINESS` que Business (le plan vient du champ `key.plan` en base, jamais du texte saisi).
  - **Blocage** des clés `USED`, `SUSPENDED`/`REVOKED`, `EXPIRED` (expiration auto à la volée). Clé liée à un autre compte → refus.
  - **Aucune auto-activation utilisateur** : seul un admin émet une clé, après paiement vérifié.

## 6. Chiffrement & secrets

- **Données sensibles chiffrées** : IBAN (`src/lib/crypto.ts`, AES-256-GCM), secret TOTP chiffré, codes de secours hashés.
- **Secrets uniquement côté serveur** : aucun secret hors `NEXT_PUBLIC_*` n'est importé dans un composant client (vérifié — `grep` « use client » + `process.env`). Seule la clé **publiable** Stripe (`pk_…`, publique par nature) est exposée.
- Variables marquées *Sensitive* côté Vercel (DB, secrets) non récupérables en clair.

## 7. En-têtes de sécurité (`src/middleware.ts`)

`X-Content-Type-Options: nosniff` · `X-Frame-Options: DENY` (SAMEORIGIN sur `/pay`) ·
`Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy` (caméra/micro/géo désactivés) ·
`Strict-Transport-Security` (HSTS, 2 ans, preload) · **Content-Security-Policy** restrictive
(`default-src 'self'`, sources limitées à Stripe + Vercel Analytics, `frame-ancestors 'none'`).

> Note : la CSP autorise `'unsafe-inline'`/`'unsafe-eval'` pour les scripts, requis par Next.js et Stripe.js. Durcissement possible via CSP à nonce (voir §11).

## 8. Journalisation & monitoring

- **`SecurityLog`** : login (succès/échec/2FA), activations (succès/échec), vérifications crypto, overrides, signatures webhook invalides.
- **`AuditLog`** : paiements, changements de plan, génération/suspension de clés, actions admin.
- **`ActivationLog`** : cycle de vie complet des clés.
- **Alertes d'activité suspecte** (`src/lib/services/security-monitor.ts` → `AdminAlert`) :
  - brute-force de clés (≥ 5 échecs/10 min pour un compte) → alerte **CRITICAL** ;
  - verrouillage de compte après échecs de login → alerte.
- **Guardian** (`src/lib/guardian`) : contrôles automatiques santé/sécurité (cron) + Chargeback Defender (scoring de risque des paiements).

## 9. Failles corrigées dans cette passe

1. **2FA non imposée aux admins** → désormais **obligatoire** pour accéder au panneau admin.
2. **Panneau admin sans garde serveur** (layout) → ajout d'une garde serveur (session + rôle + actif + 2FA) en plus des contrôles API.
3. **Multi-devises ouvert à tous** → **réservé Pro/Business** côté serveur (`create-intent`).
4. **Logo/couleur personnalisés ouverts à tous** → **réservés Pro/Business** côté serveur (`payment-link`).
5. **Paiements LTC non vérifiés** (aucun contrôle d'existence/montant) → **vérification on-chain stricte** (existence + adresse + montant + confirmations), blocage par défaut, override tracé.
6. **Pas d'alerte sur activité suspecte** → alertes admin sur brute-force de clés et verrouillage de comptes.
7. **Audit dépendances** → voir §10.

## 10. Dépendances

- `npm audit` : 2 vulnérabilités **modérées** dans `postcss` (transitif via Next.js).
- **Impact réel : nul au runtime** — il s'agit d'un XSS dans le *stringify* CSS de PostCSS, exploité uniquement au **build** sur du CSS non fiable, ce que Yourazz ne fait pas.
- Le « correctif » de `npm audit fix --force` **rétrograderait Next.js en 9.x** (cassant) → **à ne pas appliquer**.
- **Recommandation** : suivre les releases Next.js 15.x et mettre à jour (avec test du build) lorsqu'un patch embarque `postcss ≥ 8.5.10`.

## 11. Maintenance & recommandations

**Routine**
- Lancer `npm run security:check` avant chaque déploiement majeur (invariants clés/permissions).
- Surveiller les `AdminAlert` (cloche admin) et les `SecurityLog` de sévérité `WARNING`/`CRITICAL`.
- Garder secrets et clés hors du dépôt (`.env` est git-ignoré ; ne jamais committer de secret).

**Migrations de schéma** (base partagée avec une autre app)
- **Ne jamais** lancer `prisma db push` (il supprimerait des tables tierces). Méthode sûre :
  `prisma migrate diff … --script` → retirer les `DROP` → `prisma db execute --file …`.

**Renforcements recommandés (non bloquants)**
- **Rate limiting partagé** : remplacer le store mémoire par Upstash Redis (rate-limit fiable multi-instances).
- **CSP à nonce** : supprimer `'unsafe-inline'`/`'unsafe-eval'` via une CSP à nonce générée par le middleware.
- **Sauvegardes DB** : activer les sauvegardes quotidiennes + PITR côté Supabase (selon le plan) — non configurable depuis le code.
- **Rotation des secrets** : `JWT_SECRET`, `ENCRYPTION_KEY`, webhooks Stripe — planifier une rotation périodique.
- **Vérification LTC** : un token `BLOCKCYPHER_TOKEN` augmente les quotas ; envisager un nœud/َAPI dédié pour un volume élevé.

## 12. Couverture de la demande

| Demandé | État |
| --- | --- |
| Mots de passe hashés | ✅ bcrypt 12 |
| Anti brute-force | ✅ IP + lockout compte |
| Validation serveur | ✅ Zod partout |
| XSS / SQLi / CSRF / injection commande | ✅ React + Prisma + Origin check + pas de shell |
| Cookies HttpOnly/Secure/SameSite | ✅ |
| Rôles user/owner/admin stricts | ✅ + revérifiés en base |
| 2FA admin | ✅ obligatoire |
| Logs connexion/paiement/activation/admin | ✅ SecurityLog + AuditLog + ActivationLog |
| Webhooks Stripe signés | ✅ |
| Vérification stricte LTC avant activation | ✅ on-chain (existence/adresse/montant/confirmations) |
| Clés uniques, imprévisibles, usage unique | ✅ + typées par plan |
| Aucune activation sans paiement validé | ✅ (vérif on-chain + admin) |
| Rate limiting login/activation/paiement/API | ✅ |
| Chiffrement données sensibles | ✅ AES-256-GCM |
| Secrets côté serveur uniquement | ✅ |
| Aucun secret côté client | ✅ vérifié |
| Headers CSP/HSTS/X-Frame/X-Content-Type | ✅ |
| Anti-faux-TXID | ✅ |
| Montant = plan | ✅ |
| Blocage clés expirées/révoquées/utilisées | ✅ |
| Permissions non contournables depuis le front | ✅ tout vérifié serveur |
| Sauvegardes auto DB | ⚠️ à activer côté Supabase (§11) |
| Rate limiting partagé / CSP nonce | ⚠️ recommandés (§11) |
