# Stabilisation : CI au vert, tests Nyole fiables, documentation à jour — design

Date : 4 octobre 2026
Statut : à relire

## Objectif

Les fonctionnalités prévues par l'audit du 29 septembre sont livrées. Le dépôt n'est pourtant pas dans un état fiable :

- le CI est rouge sur `main` ;
- deux tests échouent dès qu'aucun `.env` local ne fournit de clé Nyole ;
- `CLAUDE.md` et `.claude/commands/` décrivent encore OpenBio et Stripe.

Cette tranche remet le dépôt au propre, sans toucher au comportement de l'application.

## Constat (4 octobre 2026)

| Commande | Résultat |
| --- | --- |
| `bun run typecheck` | OK |
| `bun run lint` | **1 erreur** (formatage), 15 avertissements |
| `bun run test` | **98 réussis, 2 échoués** (`src/server/payments/nyole.test.ts`) |
| CI (`.github/workflows/ci.yml`) | `typecheck` puis `lint` : rouge à cause du lint. Les tests ne sont pas lancés |

## Décisions

| Sujet | Choix |
| --- | --- |
| Erreur de lint | Corrigée par le formateur, sans autre modification |
| Avertissements Biome | Hors périmètre. Ils ne bloquent pas le CI |
| Tests Nyole | Le test remplace le module `@/env.mjs`. Aucun changement du code de production |
| Tests dans le CI | Ajoutés, après le lint |
| `CLAUDE.md` | Réécrit pour AuraSpot, dans la même structure de sections |
| `.claude/commands/stripe.md` | Supprimé. Remplacé par `payments.md` |
| Build sans secrets | Hors périmètre. Voir la fin du document |

## 1. Erreur de lint

`scripts/generate-brand-assets.ts` se termine par une ligne vide de trop. Le formateur Biome la refuse.

- Corriger avec `bunx biome format --write scripts/generate-brand-assets.ts`.
- Ne modifier aucun autre fichier : `bun run lint:fix` sur tout le dépôt appliquerait aussi des corrections « unsafe » hors sujet.

**Critère :** `bun run lint` se termine avec le code 0. Les 15 avertissements restent.

## 2. Tests Nyole indépendants du `.env`

### Cause

`src/env.mjs` (`createEnv`) lit `process.env` une seule fois, au chargement du module. Dans `src/server/payments/nyole.ts`, `secretKey()` lit ensuite `env.NYOLE_SECRET_KEY`, figé au chargement.

Les tests « session creation has a timeout » et « status reads have a timeout » définissent `process.env.NYOLE_SECRET_KEY` dans le corps du test. C'est trop tard : `env` vaut déjà `undefined`, et `secretKey()` lève « Nyole n'est pas configuré ».

Ces tests ne passent que si Bun charge un `.env` local contenant la clé. Ils échouent donc dans un dépôt fraîchement cloné et en CI.

### Correctif

Dans `src/server/payments/nyole.test.ts` :

1. Avant tout import de `./nyole`, remplacer le module d'environnement avec `mock.module` de `bun:test`. Le remplacement expose un objet `env` mutable :
   ```ts
   const testEnv: { NYOLE_SECRET_KEY?: string; NYOLE_BASE_URL?: string } = {};
   mock.module('@/env.mjs', () => ({ env: testEnv }));
   const { createNyoleSession, getNyoleSessionStatus /* … */ } = await import('./nyole');
   ```
   L'import dynamique garantit que `nyole.ts` reçoit le module remplacé.
2. Dans le bloc `Nyole requests`, définir `testEnv.NYOLE_SECRET_KEY = 'af_test_sec_unit'`. Le remettre à `undefined` dans `afterEach`, à la place de `process.env`.
3. Laisser `NYOLE_BASE_URL` indéfini : les tests de `nyoleCheckoutAction` attendent l'URL par défaut `https://app.nyole.com`.
4. Si `src/app/api/webhook/nyole/route.test.ts` dépend aussi d'une variable d'environnement, appliquer le même procédé.

`nyole.ts` ne change pas. Lire l'environnement au chargement reste le comportement voulu en production.

**Critère :** `bun run test` passe (100 sur 100) dans un clone sans `.env`, et aussi avec un `.env` qui définit une autre clé Nyole.

## 3. Tests dans le CI

Dans `.github/workflows/ci.yml`, ajouter une étape après « Run lints » :

```yaml
      - name: Run tests
        run: bun run test
```

Le script `test` définit déjà `SKIP_ENV_VALIDATION=1`, et le workflow le définit aussi globalement. Les tests n'ouvrent ni base ni réseau : `fetch` est remplacé.

**Critère :** le workflow passe sur la branche, et un test cassé fait échouer le CI.

## 4. `CLAUDE.md` réécrit pour AuraSpot

Le fichier actuel induit les sessions en erreur : nom OpenBio, Stripe, plans Free/Pro, trois routers, `profileLink` présenté comme cœur du produit. Le réécrire avec la même structure de sections (Tech Stack, Commands, Project Structure, Key Patterns, Conventions), à partir du code et non de l'ancien texte.

### Contenu attendu

**Présentation.** AuraSpot, dérivé d'OpenBio (AGPL-3.0). Annuaire de personnalités, fiches publiques `/{slug}`, dons sans compte en FCFA, revendication et vérification, retraits avec commission, administration. Langue de l'interface : français.

**Tech Stack.**
- Retirer Stripe.
- Paiements : MTN MoMo et Airtel Money en direct, Nyole (carte et Mobile Money).
- OAuth : Google seulement, d'après `src/lib/auth.ts`. À vérifier au moment de la rédaction.
- PostgreSQL : Neon (HTTP) ou toute base Postgres (`pg`), détectée dans `src/server/db/db.ts`.
- Sans Upstash, cache et limitation de débit fonctionnent en mémoire.

**Commands.** Ajouter :
- `bun run test`, avec `SKIP_ENV_VALIDATION=1` ;
- les scripts `scripts/seed-personalities.ts`, `momo-sandbox-user.ts`, `momo-sandbox-check.ts` et `generate-brand-assets.ts`.

**Project Structure.**
- Routes : `/explore`, `/[link]` (fiche), `/claim/[slug]`, `/support/[slug]`, `/support/checkout/[paymentId]`, `/report/[slug]`, `/account/supports`, `/personalities/[slug]/withdrawals`, `/admin/*` (fiches, catégories, revendications, paiements, retraits, signalements).
- API : webhooks `momo`, `airtel`, `nyole`, `payments`, `payouts` ; crons `digest` et `recurring`.
- Routers tRPC : `admin`, `personality`, `profileLink`, `support`, `user`.
- Tables : `personality.ts`, `category.ts`, `support.ts` (paiements, journal, retraits, dons mensuels), en plus des tables existantes.
- `src/server/payments/` : prestataires et transitions de statut.
- `src/server/db/utils/` : `support.ts`, `recurring.ts`, et les e-mails de retrait et de renouvellement.
- E-mails : `support-renewal`, `withdrawal-update`, en plus des modèles existants.

**Key Patterns.** Remplacer « Plans & Billing » par une section « Dons et paiements » :
- Un paiement commence en `sandbox`, c'est-à-dire sans opérateur choisi.
- Le donateur choisit ensuite MoMo, Airtel ou Nyole.
- Le statut est toujours relu auprès du prestataire (`syncPayment`). Les webhooks sont idempotents, et le retour sur `success_url` ne crédite rien.
- Le solde se reconstitue depuis le journal comptable.
- La commission est prélevée au retrait (`SUPPORT_COMMISSION_BPS`).
- Les retraits sont validés à la main dans `/admin/withdrawals`.
- Un don mensuel est une demande de paiement envoyée chaque mois. Le mobile money ne permet pas de débit sans le code PIN.

Autres sections :
- **Fiche personnalité :** `claimStatus` et `verificationStatus` sont séparés. Plusieurs gestionnaires possibles (`personality_manager`). `canEdit` = propriétaire ou gestionnaire.
- **Administration :** accès via `ADMIN_EMAILS`.
- **Réseaux sociaux :** un seul registre, `src/lib/social-platforms.ts`.
- **Bento :** mettre à jour la liste des types d'après `src/types.ts`. Elle comprend maintenant `video` et `video-embed`.

**Environment Variables.** Reprendre `.env.example` :
- variables obligatoires et facultatives ;
- `NEXT_PUBLIC_ROOT_DOMAIN`, `ADMIN_EMAILS`, `SUPPORT_COMMISSION_BPS`, `PAYMENTS_WEBHOOK_SECRET`, `CRON_SECRET` ;
- variables `NYOLE_*`, `MOMO_*` et `AIRTEL_*`.

Retirer toutes les variables `STRIPE_*`.

**Conventions.** Conserver les conventions actuelles et ajouter :
- textes d'interface en français ;
- specs et plans dans `docs/superpowers/` ;
- tests unitaires `*.test.ts` à côté du code, lancés avec `bun test`.

**Critère :** chaque chemin, script, router et variable cité dans `CLAUDE.md` existe dans le dépôt. `grep -i stripe CLAUDE.md` ne renvoie rien.

## 5. Commandes `.claude/commands/`

- Supprimer `stripe.md`.
- Créer `payments.md` : comment ajouter un prestataire, avec l'interface `CheckoutProvider`, `syncPayment`, les transitions de `transitions.ts`, un webhook signé et des tests sur le modèle de `nyole.test.ts`.
- Relire `auth.md`, `bento.md`, `db-schema.md` et `trpc-router.md`. Corriger toute mention de Stripe, des plans, d'OpenBio ou de fournisseurs OAuth retirés.

## Ordre et commits

1. `style: format generate-brand-assets` (§ 1)
2. `test(payments): Nyole tests no longer depend on .env` (§ 2)
3. `ci: run unit tests` (§ 3)
4. `docs: CLAUDE.md describes AuraSpot` (§ 4)
5. `docs: payments command replaces stripe` (§ 5)

Vérifier avant chaque commit : `bun run typecheck`, `bun run lint`, `bun run test`.

## Hors périmètre

- **Les 15 avertissements Biome**, dont la complexité de `profile-hero.tsx` et des fonctions `async` sans `await`.
- **Le build sans secrets.** `next build` échoue pendant la collecte des pages s'il manque `RESEND_API_KEY` ou `DATABASE_URL`. En effet, `new Resend(...)` (`src/server/emails.ts`) et la connexion de `src/server/db/db.ts` s'exécutent au chargement du module. Ce n'est pas bloquant sur Vercel, où les variables sont définies. Une tranche à part pourra rendre ces initialisations paresseuses.
- **La configuration de production des paiements** : clés live MoMo, Airtel et Nyole, et devise XAF.
- **Les tests de bout en bout** des parcours don, don mensuel et retrait.
