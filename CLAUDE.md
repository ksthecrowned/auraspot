# AuraSpot

Annuaire de personnalités, dérivé d'OpenBio (AGPL-3.0). Fiches publiques à `/{slug}`, dons sans compte en FCFA, revendication et vérification, retraits avec commission, administration. L'interface est en français.

## Tech Stack

- **Framework** : Next.js 16 (App Router). Le serveur de développement utilise webpack : Turbopack entre dans une boucle de plantage sous Windows (`Next.js package not found`).
- **Language** : TypeScript 5.7+ (mode strict, `noUncheckedIndexedAccess`)
- **Runtime** : Bun
- **Styling** : Tailwind CSS 4 (configuration CSS dans `src/styles/globals.css`)
- **UI** : shadcn/ui (primitives Radix) + icônes Lucide
- **Rich Text** : Tiptap (cartes note)
- **API** : tRPC 11 (`@trpc/tanstack-react-query`)
- **Database** : PostgreSQL via Drizzle. `src/server/db/db.ts` utilise le client HTTP Neon si l'URL contient `.neon.tech`, sinon le protocole `pg` (AlwaysData, Postgres local, etc.)
- **Cache** : Upstash Redis. Sans `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`, le cache (`src/lib/redis.ts`) et la limitation de débit (`src/lib/ratelimit.ts`) restent en mémoire
- **Auth** : Better Auth (e-mail / mot de passe + Google OAuth, d'après `src/lib/auth.ts`)
- **Payments** : MTN MoMo et Airtel Money en direct, Nyole (carte et Mobile Money)
- **Email** : Resend (transactionnel + digest)
- **File Storage** : Cloudflare R2 (API S3 via `@aws-sdk/client-s3`, helpers dans `src/lib/storage.ts`)
- **Analytics** : vues, clics, appareil et géo (`ua-parser-js`)
- **Linting** : Biome + Ultracite (`biome.json` étend `ultracite`)
- **Git Hooks** : Husky (pre-commit : `bunx biome check --write --staged --no-errors-on-unmatched`)

## Commands

```bash
bun dev              # Serveur de développement (webpack)
bun run build        # Build de production
bun run lint         # Lint Biome
bun run lint:fix     # Lint et corrections
bun run format       # Formatage Biome
bun run typecheck    # Vérification TypeScript (tsc --noEmit)
bun run test         # Tests unitaires (SKIP_ENV_VALIDATION=1, bun test src)
bun run db:generate  # Générer les migrations Drizzle
bun run db:push      # Pousser le schéma
bun run db:migrate   # Appliquer les migrations
bun run db:studio    # Drizzle Studio
```

Scripts :

```bash
bun run scripts/seed-personalities.ts
bun run scripts/momo-sandbox-user.ts
bun run scripts/momo-sandbox-check.ts
bun run scripts/generate-brand-assets.ts
```

## Project Structure

```
src/
├── app/
│   ├── (home)/                         # Accueil
│   ├── explore/                        # Annuaire
│   ├── [link]/                         # Fiche publique
│   ├── claim/[slug]/                   # Revendication
│   ├── claim-link/                     # Ancien parcours de claim
│   ├── create-link/                    # Création de fiche
│   ├── support/[slug]/                 # Don
│   ├── support/checkout/[paymentId]/   # Suivi du paiement
│   ├── report/[slug]/                  # Signalement
│   ├── account/supports/               # Dons du compte
│   ├── personalities/[slug]/withdrawals/
│   ├── admin/                          # Fiches, catégories, revendications,
│   │                                   # paiements, retraits, signalements
│   ├── app/                            # Tableau de bord (auth)
│   └── api/
│       ├── auth/[...all]/
│       ├── trpc/[trpc]/
│       ├── upload/
│       ├── webhook/{momo,airtel,nyole,payments,payouts}/
│       ├── cron/{digest,recurring}/
│       └── unsubscribe/
├── components/
│   ├── bento/
│   ├── emails/          # verify-email, welcome, reset-password,
│   │                    # analytics-digest, support-renewal, withdrawal-update
│   └── ui/
├── server/
│   ├── api/routers/     # admin, personality, profileLink, support, user
│   ├── payments/        # prestataires et transitions de statut
│   ├── emails.ts
│   └── db/
│       ├── schema/      # user, link, link-view, link-click, email-subscriber,
│       │                # personality, category, support
│       └── utils/       # link, personality, admin, support, recurring,
│                        # recurring-emails, withdrawal-emails
├── lib/
│   ├── auth.ts
│   ├── social-platforms.ts
│   └── money.ts
└── types.ts             # BentoCard, BentoType
```

## Key Patterns

### Authentication

- Serveur : `auth.api.getSession({ headers: await headers() })`
- Client : `useSession()` depuis `@/lib/auth-client`
- tRPC : `protectedProcedure` exige `ctx.user`
- OAuth configuré : Google seulement

### tRPC

- Point d'entrée unique : `/api/trpc`
- `publicProcedure` et `protectedProcedure`
- Client : `useTRPC()` depuis `@/trpc/react`
- Routers : `admin`, `personality`, `profileLink`, `support`, `user`

### Database

- Schéma dans `src/server/db/schema/`
- Requêtes dans `src/server/db/utils/`
- Config : `drizzle.config.ts`
- Cache profil : Upstash, 30 min quand Redis est configuré

### Rate Limiting

- `@upstash/ratelimit` si Redis est configuré, sinon compteur en mémoire (`src/lib/ratelimit.ts`)

### Fiche personnalité

- `claimStatus` (`unclaimed` | `claimed`) et `verificationStatus` (`unverified` | `verified`) sont indépendants (`src/server/db/schema/link.ts`)
- Plusieurs gestionnaires : table `personality_manager`
- `canEdit` : propriétaire du lien (`link.userId`) ou ligne dans `personality_manager` (`isProfileLinkEditor`)

### Administration

- Accès réservé aux e-mails listés dans `ADMIN_EMAILS` (`src/lib/admin.ts`)

### Réseaux sociaux

- Un seul registre : `src/lib/social-platforms.ts`
- Icônes : `src/components/icons/social-icons.tsx`

### Bento

- Grille `react-grid-layout`
- Types dans `src/types.ts` : `link`, `note`, `image`, `video`, `map`, `github`, `email-collect`, `countdown`, `weather`, `twitter`, `music`, `video-embed`, `calendar`, `views`
- Tailles : `2x2`, `4x1`, `2x4`, `4x2`, `4x4`
- Colonnes : 2 en mobile (`sm`), 4 en desktop (`md`)
- Stocké en JSON dans `link.bento`

### Dons et paiements

- Un paiement commence en `sandbox` : aucun opérateur n'est encore choisi (`getCheckoutProvider` dans `src/server/payments/provider.ts`)
- Le donateur choisit ensuite MTN MoMo, Airtel Money ou Nyole
- Le statut est toujours relu chez le prestataire (`syncPayment` dans `src/server/db/utils/support.ts`). Les webhooks sont idempotents. Le retour sur `success_url` ne crédite rien
- Le solde se reconstitue depuis le journal `ledger_entry`
- La commission est prélevée au retrait (`SUPPORT_COMMISSION_BPS`, `splitWithdrawal` dans `src/lib/money.ts`)
- Les retraits sont validés à la main dans `/admin/withdrawals`
- Un don mensuel est une demande de paiement envoyée chaque mois (`src/server/db/utils/recurring.ts`). Le mobile money ne permet pas un débit sans le code PIN
- Transitions autorisées : `canTransition` dans `src/server/payments/transitions.ts`

## Environment Variables

Validées dans `src/env.mjs` (`@t3-oss/env-nextjs`), sauf `NEXT_PUBLIC_ROOT_DOMAIN`, lu dans `src/lib/site.ts`.

Obligatoires : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `NEXT_PUBLIC_URL`.

Facultatives : `EMAIL_FROM`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `VERCEL_TOKEN`.

Produit et paiements :

- `NEXT_PUBLIC_ROOT_DOMAIN` — domaine des fiches (défaut `auraspot.me`)
- `ADMIN_EMAILS` — e-mails administrateurs, séparés par des virgules
- `SUPPORT_COMMISSION_BPS` — commission au retrait, en points de base (défaut 1000 = 10 %)
- `PAYMENTS_WEBHOOK_SECRET` — secret des webhooks paiements et retraits
- `CRON_SECRET` — jeton Bearer de `/api/cron/digest` et `/api/cron/recurring` (au moins 16 caractères). Le générer avec `openssl rand -base64 32`. Vercel ne l'envoie dans `Authorization: Bearer <CRON_SECRET>` que si la variable est définie sur le projet. Sans elle, les deux routes répondent 401 et le travail planifié ne s'exécute pas. La poser sur Production, puis redéployer. En local : `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/recurring`
- `NYOLE_SECRET_KEY`, `NYOLE_BASE_URL`
- `MOMO_BASE_URL`, `MOMO_TARGET_ENVIRONMENT`, `MOMO_COLLECTION_SUBSCRIPTION_KEY`, `MOMO_API_USER`, `MOMO_API_KEY`, `MOMO_CURRENCY`, `MOMO_COUNTRY`
- `AIRTEL_BASE_URL`, `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET`, `AIRTEL_COUNTRY`, `AIRTEL_CURRENCY`

Le modèle complet est `.env.example`. `bun run test` définit `SKIP_ENV_VALIDATION=1`.

## Conventions

- Utiliser `bun`, pas npm ni pnpm
- Composants serveur par défaut ; `"use client"` seulement si nécessaire
- `await headers()` et `await cookies()`
- Styles dans `src/styles/globals.css` (pas de `tailwind.config.ts`)
- Biome pour le lint et le format (pas ESLint ni Prettier)
- Alias `@/*` → `src/*`
- Changement de schéma : `bun run db:generate` puis `bun run db:push`
- Types partagés dans `src/types.ts`
- Formulaires : `zod` + `react-hook-form` + `@hookform/resolvers`
- Textes d'interface en français
- Specs et plans dans `docs/superpowers/`
- Tests unitaires `*.test.ts` à côté du code, lancés avec `bun test`
