# Reconnaissance des soutiens — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre un don réussi visible (dédicace, objectif de collecte, carte « J'ai soutenu X ») sans jamais afficher le montant d'un don individuel.

**Architecture:** Les règles qui se testent sans base vivent dans `src/lib/` (`dedication`, `share-card`, `support-goal`). Le schéma Drizzle et les requêtes dans `src/server/db/utils/support.ts` appliquent ces règles. L'interface (formulaire de don, fiche, page des messages, paiement, statistiques) n'affiche que ce que ces requêtes renvoient.

**Tech Stack:** Next.js 16 App Router, tRPC 11, Drizzle (PostgreSQL), Bun (`bun test`), Biome, `ImageResponse` (`next/og`).

**Spec:** `docs/superpowers/specs/2026-10-04-reconnaissance-des-soutiens-design.md`

## Global Constraints

- Un don individuel ne montre jamais son montant. Ni sur la fiche, ni dans une dédicace, ni sur une carte de partage.
- Rien n'est public sans l'accord du fan. La dédicace et le nom sur la carte suivent `support.isPublic`.
- Seul un paiement au statut `success` compte. Un don en attente, échoué, annulé ou remboursé n'affiche ni dédicace ni progression.
- Seules les fiches revendiquées et vérifiées sont concernées (`canReceiveSupport` dans `src/lib/support-eligibility.ts`). Une fiche suspendue n'affiche ni dédicace, ni objectif, ni carte.
- Message : 280 caractères au maximum, ignoré si `isPublic` est faux. Réponse du créateur : 140 caractères au maximum.
- Montant cible d'un objectif : entier, de 10 000 à 50 000 000 XAF. Un seul objectif `active` par fiche.
- Progression publique : pourcentage arrondi à l'unité inférieure, plafonné à 100. Le total en FCFA n'est visible que par un gestionnaire (`personality.goalTotal`).
- `?src=` n'accepte que `carte`, `qr`, `bio`. Toute autre valeur est ignorée, puis le paramètre est retiré de l'URL.
- Textes visibles en français, apostrophe typographique `’` comme le reste du code.
- `bun` pour toutes les commandes. Biome sur les fichiers touchés (`bunx biome check --write <fichiers>`). Tests : `bun run test` (ou `bun test <fichier>`).
- Chaque phase a sa migration (`bun run db:generate`) et ses commits. Ne pas mélanger les colonnes d'une phase suivante dans la migration de la phase en cours.
- La route d'image utilise `ImageResponse`, mais le runtime est `nodejs` : `src/server/db/db.ts` importe `pg`, qui ne se charge pas en Edge.

## Review Focus

1. **Montant absent** des sélections `support.messages`, de la carte OG et du pourcentage public.
2. **Message ignoré** quand `isPublic` est faux, à la création comme à l'édition si le soutien n'est plus public… Non : l'édition peut enregistrer le texte, mais la liste publique filtre `isPublic`. Rendre le soutien privé (`setVisibility`) le retire de la fiche sans effacer `message`.
3. **Remboursement** : plus de paiement `success`, donc la dédicace disparaît et le pourcentage baisse.
4. **Un seul objectif actif** : index unique partiel, `createGoal` renvoie un conflit.
5. **Carte** : 404 si le paiement n'est pas `success`. Le bouton de partage n'apparaît qu'après succès.
6. **`?src=`** : valeur hors liste blanche stockée comme `null`.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/dedication.ts` | Texte de dédicace accepté à la création, retours à la ligne affichés. |
| `src/lib/dedication.test.ts` | Tests du précédent. |
| `src/lib/share-card.ts` | Titre de la carte et liste blanche `?src=`. |
| `src/lib/share-card.test.ts` | Tests du précédent. |
| `src/lib/support-goal.ts` | Bornes du montant cible et pourcentage affiché. |
| `src/lib/support-goal.test.ts` | Tests du précédent. |
| `src/server/db/schema/support.ts` | Colonnes de message (phase 1), puis `support_goal` et `goalId` (phase 3). |
| `src/server/db/schema/personality.ts` | Motif `inappropriate_message`, colonne `supportId` sur le signalement. |
| `src/server/db/schema/link-view.ts` | Colonne `source`. |
| `src/server/db/utils/support.ts` | Insertion du message, liste, remerciement, masquage, édition, progression. |
| `src/server/db/utils/recurring.ts` | Renouvellement sans message ; `goalId` de l'objectif actif (phase 3) ; clôture des objectifs échus. |
| `src/server/api/schemas/support.ts` | Schémas zod des nouvelles procédures. |
| `src/server/api/routers/support.ts` | `messages`, `thank`, `hideMessage`, `editMessage`. |
| `src/server/api/routers/personality.ts` | `goal`, `createGoal`, `closeGoal`, `goalTotal`. |
| `src/components/forms/create-support.tsx` | Champ message. |
| `src/app/[link]/_components/community.tsx` | Trois dédicaces au-dessus des avatars. |
| `src/app/[link]/messages/page.tsx` | Liste paginée. |
| `src/app/api/og/support/[paymentId]/route.tsx` | Image 1080×1920 et `?format=wide`. |
| `src/components/forms/share-support-card.tsx` | Bouton WhatsApp après succès. |
| `src/app/api/cron/recurring/route.ts` | Clôt aussi les objectifs échus. Reste le même chemin. |

---

### Task 1: Règles pures des dédicaces

**Files:**
- Create: `src/lib/dedication.ts`
- Create: `src/lib/dedication.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `DEDICATION_MAX_LENGTH = 280`
  - `THANK_YOU_MAX_LENGTH = 140`
  - `dedicationForCreate(input: { message?: string; isPublic: boolean }): string | null`
  - `clampDedicationLines(text: string, maxBreaks?: number): string` — au plus `maxBreaks` retours à la ligne (défaut 3), le surplus est remplacé par des espaces.

- [ ] **Step 1: Écrire les tests (échouent)**

`src/lib/dedication.test.ts` :

```ts
import { describe, expect, test } from 'bun:test';
import { clampDedicationLines, dedicationForCreate } from './dedication';

describe('dedicationForCreate', () => {
  test('garde un message public tronqué des espaces', () => {
    expect(
      dedicationForCreate({ message: '  Bravo Aïcha  ', isPublic: true })
    ).toBe('Bravo Aïcha');
  });

  test('refuse un message de plus de 280 caractères', () => {
    expect(
      dedicationForCreate({ message: 'a'.repeat(281), isPublic: true })
    ).toBeNull();
  });

  test('accepte exactement 280 caractères', () => {
    const text = 'a'.repeat(280);
    expect(dedicationForCreate({ message: text, isPublic: true })).toBe(text);
  });

  test('ignore le message si le soutien n’est pas public', () => {
    expect(
      dedicationForCreate({ message: 'Bravo', isPublic: false })
    ).toBeNull();
  });

  test('ignore un message vide', () => {
    expect(dedicationForCreate({ message: '   ', isPublic: true })).toBeNull();
    expect(dedicationForCreate({ isPublic: true })).toBeNull();
  });
});

describe('clampDedicationLines', () => {
  test('conserve trois retours à la ligne', () => {
    expect(clampDedicationLines('a\nb\nc\nd')).toBe('a\nb\nc\nd');
  });

  test('remplace les retours au-delà de trois par des espaces', () => {
    expect(clampDedicationLines('a\nb\nc\nd\ne')).toBe('a\nb\nc\nd e');
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `bun test src/lib/dedication.test.ts`

Expected: FAIL, module `./dedication` introuvable.

- [ ] **Step 3: Implémentation minimale**

`src/lib/dedication.ts` :

```ts
export const DEDICATION_MAX_LENGTH = 280;
export const THANK_YOU_MAX_LENGTH = 140;

// Stored only for a public support. Private supports keep the column null.
export function dedicationForCreate(input: {
  message?: string;
  isPublic: boolean;
}): string | null {
  if (!input.isPublic) {
    return null;
  }
  const text = input.message?.trim() ?? '';
  if (!text || text.length > DEDICATION_MAX_LENGTH) {
    return null;
  }
  return text;
}

export function clampDedicationLines(text: string, maxBreaks = 3) {
  let breaks = 0;
  let out = '';
  for (const char of text) {
    if (char === '\n') {
      breaks += 1;
      out += breaks <= maxBreaks ? '\n' : ' ';
    } else {
      out += char;
    }
  }
  return out;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `bun test src/lib/dedication.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dedication.ts src/lib/dedication.test.ts
git commit -m "$(cat <<'EOF'
feat: dedication text rules ignore private supports

EOF
)"
```

---

### Task 2: Colonnes de dédicace sur `support`

**Files:**
- Modify: `src/server/db/schema/support.ts`
- Create: migration générée dans `src/server/db/drizzle/`

**Interfaces:**
- Consumes: table `support` existante.
- Produces: colonnes `message`, `messageHiddenAt`, `thankedAt`, `thankYouReply` et l'index `support_personality_message_idx`. Pas de `goalId` dans cette migration.

- [ ] **Step 1: Ajouter les colonnes**

Dans l'objet de `support`, après `isPublic` :

```ts
    message: text('message'),
    messageHiddenAt: timestamp('message_hidden_at', { withTimezone: true }),
    thankedAt: timestamp('thanked_at', { withTimezone: true }),
    thankYouReply: text('thank_you_reply'),
```

Dans le tableau d'index, après `support_recurring_support_id_idx` :

```ts
    index('support_personality_message_idx')
      .on(table.personalityId, table.createdAt)
      .where(sql`${table.message} is not null`),
```

`sql` est déjà importé depuis `drizzle-orm`.

- [ ] **Step 2: Générer la migration**

Run: `bun run db:generate`

Nommer la migration `support_dedication` si drizzle-kit le demande. Vérifier que le SQL ne contient que ces quatre colonnes et l'index partiel. Ne pas l'appliquer à la production dans cette tâche ; `bun run db:push` reste une action manuelle sur la base de dev quand on veut l'essayer.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/support.ts src/server/db/drizzle
git commit -m "$(cat <<'EOF'
feat: store optional public dedications on supports

EOF
)"
```

---

### Task 3: Enregistrer le message à la création du don

**Files:**
- Modify: `src/server/api/schemas/support.ts`
- Modify: `src/server/api/routers/support.ts` (`create`)
- Modify: `src/server/db/utils/support.ts` (`createSupportCheckout`)
- Modify: `src/components/forms/create-support.tsx`

**Interfaces:**
- Consumes: `dedicationForCreate` (`@/lib/dedication`).
- Produces: `CreateSupportSchema` avec `message` facultatif. `createSupportCheckout` accepte `message?: string` et écrit `support.message` via `dedicationForCreate`. Le renouvellement dans `recurring.ts` ne passe pas de message (la colonne reste nulle).

- [ ] **Step 1: Étendre le schéma zod**

Dans `CreateSupportSchema`, après `isPublic` :

```ts
  message: z.string().trim().max(280).optional().or(z.literal('')),
```

Le routeur ne fait pas confiance au seul zod pour le cas « privé » : il passe la chaîne à `createSupportCheckout`, qui appelle `dedicationForCreate`.

- [ ] **Step 2: Brancher la création**

Signature de `createSupportCheckout`, ajouter `message?: string`. Dans `.values({...})` de l'insert `support` :

```ts
      message: dedicationForCreate({
        message: input.message,
        isPublic: input.isPublic,
      }),
```

Dans `supportRouter.create`, passer `message: input.message || undefined`.

- [ ] **Step 3: Champ sur le formulaire**

Dans `create-support.tsx`, état `message` (chaîne, défaut `''`). Sous le switch « Afficher mon nom » :

- si `isPublic` est faux : textarea désactivée, mention « Les messages accompagnent un soutien public » ;
- si `isPublic` est vrai : label `Votre message pour {prénom}` — le composant reçoit une nouvelle prop `firstName: string`. `maxLength={280}`. Placeholder facultatif.

`mutateAsync` envoie `message`. Le prénom vient de la page `/support/[slug]` (déjà connue : passer `firstNameOf` du nom de la fiche).

- [ ] **Step 4: Vérifier**

Run: `bun test src/lib/dedication.test.ts` et `bunx biome check --write` sur les fichiers touchés.

Expected: PASS. Le formulaire se vérifie au navigateur sur `/support/[slug]` : message désactivé tant que le nom n'est pas public, envoyé quand il l'est.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/schemas/support.ts src/server/api/routers/support.ts src/server/db/utils/support.ts src/components/forms/create-support.tsx src/app/support
git commit -m "$(cat <<'EOF'
feat: accept an optional public dedication when creating a support

EOF
)"
```

---

### Task 4: Afficher les dédicaces

**Files:**
- Modify: `src/server/api/schemas/support.ts`
- Modify: `src/server/api/routers/support.ts`
- Modify: `src/server/db/utils/support.ts`
- Modify: `src/app/[link]/_components/community.tsx`
- Modify: `src/app/[link]/page.tsx` (passer les dédicaces)
- Create: `src/app/[link]/messages/page.tsx`
- Create: `src/app/[link]/messages/message-list.tsx` (`"use client"` si pagination)

**Interfaces:**
- Consumes: colonnes de la tâche 2, `clampDedicationLines`.
- Produces:
  - `listVisibleDedications(personalityId: string, page: number): Promise<{ items: DedicationItem[]; total: number }>`
  - `DedicationItem = { id: string; displayName: string; message: string; createdAt: Date; isMonthly: boolean; thankedAt: Date | null; thankYouReply: string | null }`
  - `support.messages` : input `{ slug, page }`, `generalLimit`, aucun montant dans le retour.
  - Page `/{slug}/messages`, 20 par page. La fiche montre les 3 plus récentes.

Une dédicace est visible seulement si : `message` non nul, `messageHiddenAt` nul, `isPublic` vrai, un `payment.status = 'success'`, fiche non suspendue (`link.status` actif, même filtre que la fiche publique). `isMonthly` vaut `recurringSupportId is not null`. `displayName` vide devient « Quelqu’un ». Le texte renvoyé passe par `clampDedicationLines`.

- [ ] **Step 1: Requête et procédure**

Schéma :

```ts
export const SupportMessagesSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  page: z.number().int().min(1).default(1),
});
```

`support.messages` est un `publicProcedure` limité par `generalLimit`. Page size 20. Trier `support.createdAt` descendant. Compter le total avec les mêmes filtres.

Jointure : `support` → `payment` (`status = 'success'`) → `link` (slug, statut public). `distinct` sur `support.id` pour ne pas dupliquer si plusieurs paiements.

- [ ] **Step 2: Fiche et page**

`Community` reçoit `dedications: DedicationItem[]` et `total: number`. Au-dessus des avatars, titre déjà « Communauté », puis jusqu'à 3 cartes : initiales (`AVATAR_COLORS`, `initialsOf`), nom, date relative en français (`il y a 2 jours` via `Intl.RelativeTimeFormat` ou une fonction locale sans dépendance), badge « Soutien mensuel » si `isMonthly`, cœur et `thankYouReply` si `thankedAt`. Lien « Voir les N messages » vers `/${slug}/messages` seulement si `total > 3`.

La page messages réutilise la même carte et un lien page suivante / précédente. Pas de Markdown, pas de `<a>` autour des URL : le texte est dans un `<p>` avec `whitespace-pre-wrap`.

- [ ] **Step 3: Vérifier**

`bunx biome check --write` sur les fichiers touchés. Au navigateur, fiche sans dédicace : la section Communauté actuelle reste. Avec une dédicace de test en base (paiement `success`, `isPublic`, message) : elle apparaît, sans montant.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/schemas/support.ts src/server/api/routers/support.ts src/server/db/utils/support.ts src/app/[link]
git commit -m "$(cat <<'EOF'
feat: show public dedications on the fiche

EOF
)"
```

---

### Task 5: Remercier, masquer, modifier

**Files:**
- Modify: `src/server/api/schemas/support.ts`
- Modify: `src/server/api/routers/support.ts`
- Modify: `src/server/db/utils/support.ts`
- Modify: `src/app/[link]/_components/community.tsx` (actions si `canEdit`)
- Modify: `src/app/account/supports/page.tsx` et `src/components/forms/supporter-history-actions.tsx` (éditer ou retirer son message)

**Interfaces:**
- Consumes: `isProfileLinkEditor` (`@/server/db/utils/link`), `THANK_YOU_MAX_LENGTH`, `isAdmin` (`@/lib/admin`).
- Produces:
  - `support.thank` — gestionnaire. Input `{ supportId: uuid, thankYouReply?: string }`. Pose `thankedAt` (nouvelle date à chaque appel) et `thankYouReply` trimée, `null` si vide, erreur `BAD_REQUEST` si plus de 140 caractères.
  - `support.hideMessage` — gestionnaire ou admin. Pose `messageHiddenAt`. Ne touche pas au paiement.
  - `support.editMessage` — utilisateur connecté dont `support.userId` est le sien. Input `{ supportId, message?: string }`. Chaîne vide met `message` à `null`. Sinon trim, max 280, et si `isPublic` est faux la valeur stockée reste `null` (on n'enregistre pas une dédicace privée). Le don n'est pas modifié.

- [ ] **Step 1: Schémas**

```ts
export const ThankSupportSchema = z.object({
  supportId: z.string().uuid(),
  thankYouReply: z.string().trim().max(140).optional().or(z.literal('')),
});

export const HideSupportMessageSchema = z.object({
  supportId: z.string().uuid(),
});

export const EditSupportMessageSchema = z.object({
  supportId: z.string().uuid(),
  message: z.string().trim().max(280).optional().or(z.literal('')),
});
```

- [ ] **Step 2: Mutations**

`thank` et `hideMessage` : `protectedProcedure`. Charger le `support` et sa fiche. `thank` exige `isProfileLinkEditor`. `hideMessage` exige `isProfileLinkEditor` ou `isAdmin(ctx.user.email)`. Introuvable ou interdit : `NOT_FOUND` / `FORBIDDEN` comme le reste du routeur.

`editMessage` : `protectedProcedure`, `where` sur `id` et `userId`. Zéro ligne : `NOT_FOUND`.

- [ ] **Step 3: Interface**

Sur la fiche, si `canEdit` : bouton cœur « Remercier » (textarea 140, facultative) et « Masquer ». Sur `/account/supports`, si le soutien a un `userId` (toujours, sur cette page) : champ pour modifier ou vider le message. Étendre le type renvoyé par `getSupporterHistory` avec `message: string | null` — toujours pas de montant nouveau, le montant de l'historique donateur existe déjà et reste sur cette page privée.

- [ ] **Step 4: Vérifier au navigateur**

Gestionnaire : remercier puis masquer. Le message masqué disparaît de la fiche, le don reste dans l'historique. Fan : vider son message, il disparaît. Rendre le soutien privé via le switch existant : la dédicace disparaît, `message` est encore en base.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/schemas/support.ts src/server/api/routers/support.ts src/server/db/utils/support.ts src/app src/components/forms/supporter-history-actions.tsx
git commit -m "$(cat <<'EOF'
feat: let managers thank or hide a dedication

EOF
)"
```

---

### Task 6: Signaler une dédicace

**Files:**
- Modify: `src/server/db/schema/personality.ts`
- Modify: `src/server/api/schemas/admin.ts`
- Modify: `src/server/db/utils/admin.ts`
- Modify: `src/components/forms/report-personality.tsx` (ou un petit formulaire sur la dédicace)
- Modify: `src/components/admin/report-review.tsx`
- Create: migration `inappropriate_message`

**Interfaces:**
- Consumes: `hideMessage` (la même mise à jour `messageHiddenAt`).
- Produces:
  - `reportReasons` inclut `'inappropriate_message'`.
  - `personality_report.support_id` uuid nullable, `references(() => support.id, { onDelete: 'set null' })`. Importer `support` depuis `./support`.
  - `CreatePersonalityReportSchema.reason` inclut ce motif. `supportId: z.string().uuid().optional()`. Si le motif est `inappropriate_message`, `supportId` est obligatoire (`.superRefine`).
  - Décision admin `'hide_message'` : pose `messageHiddenAt` sur ce `supportId` et passe le signalement à `resolved`. Refusée s'il n'y a pas de `supportId`.

- [ ] **Step 1: Schéma et migration**

Ajouter la valeur d'enum dans le tableau TypeScript. PostgreSQL : si la colonne `reason` est un `text` (c'est le cas, `text('reason', { enum })` chez Drizzle sans `pgEnum`), aucune migration d'enum n'est nécessaire. La migration ne fait qu'ajouter `support_id`.

- [ ] **Step 2: Formulaire et admin**

Sur chaque dédicace publique, lien « Signaler » vers le formulaire existant avec le motif prérempli et le `supportId`. Libellé du motif : « Message inapproprié ». Dans `/admin/reports`, bouton « Masquer le message » quand `supportId` est présent. Masquer la fiche (`suspend`) reste disponible.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/personality.ts src/server/api/schemas/admin.ts src/server/db/utils/admin.ts src/components src/server/db/drizzle
git commit -m "$(cat <<'EOF'
feat: report a dedication and let an admin hide it

EOF
)"
```

La phase dédicaces est livrable ici. Les e-mails de remerciement et le digest arrivent en tâche 14.

---

### Task 7: Texte de la carte et liste blanche `?src=`

**Files:**
- Create: `src/lib/share-card.ts`
- Create: `src/lib/share-card.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type ViewSource = 'carte' | 'qr' | 'bio'`
  - `parseViewSource(value: string | null | undefined): ViewSource | null`
  - `shareCardHeadline(input: { isPublic: boolean; displayName: string | null; personalityName: string }): string`
  - `shareCardSizes(format: string | null): { width: number; height: number }` — défaut `1080×1920`, `wide` → `1200×630`.

- [ ] **Step 1: Tests (échouent)**

```ts
import { describe, expect, test } from 'bun:test';
import {
  parseViewSource,
  shareCardHeadline,
  shareCardSizes,
} from './share-card';

describe('parseViewSource', () => {
  test('accepte la liste blanche', () => {
    expect(parseViewSource('carte')).toBe('carte');
    expect(parseViewSource('qr')).toBe('qr');
    expect(parseViewSource('bio')).toBe('bio');
  });

  test('rejette le reste', () => {
    expect(parseViewSource('facebook')).toBeNull();
    expect(parseViewSource('')).toBeNull();
    expect(parseViewSource(null)).toBeNull();
    expect(parseViewSource(undefined)).toBeNull();
  });
});

describe('shareCardHeadline', () => {
  test('nomme le fan quand le soutien est public', () => {
    expect(
      shareCardHeadline({
        isPublic: true,
        displayName: 'Aïcha',
        personalityName: 'Fally Ipupa',
      })
    ).toBe('Aïcha soutient Fally Ipupa');
  });

  test('reste anonyme sinon', () => {
    expect(
      shareCardHeadline({
        isPublic: false,
        displayName: 'Aïcha',
        personalityName: 'Fally Ipupa',
      })
    ).toBe('J’ai soutenu Fally Ipupa');
    expect(
      shareCardHeadline({
        isPublic: true,
        displayName: '  ',
        personalityName: 'Fally Ipupa',
      })
    ).toBe('J’ai soutenu Fally Ipupa');
  });
});

describe('shareCardSizes', () => {
  test('portrait par défaut, paysage si wide', () => {
    expect(shareCardSizes(null)).toEqual({ width: 1080, height: 1920 });
    expect(shareCardSizes('wide')).toEqual({ width: 1200, height: 630 });
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `bun test src/lib/share-card.test.ts`

Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémentation**

```ts
const VIEW_SOURCES = ['carte', 'qr', 'bio'] as const;

export type ViewSource = (typeof VIEW_SOURCES)[number];

export function parseViewSource(
  value: string | null | undefined
): ViewSource | null {
  if (!value) {
    return null;
  }
  return VIEW_SOURCES.includes(value as ViewSource)
    ? (value as ViewSource)
    : null;
}

export function shareCardHeadline(input: {
  isPublic: boolean;
  displayName: string | null;
  personalityName: string;
}) {
  const name = input.displayName?.trim();
  if (input.isPublic && name) {
    return `${name} soutient ${input.personalityName}`;
  }
  return `J’ai soutenu ${input.personalityName}`;
}

export function shareCardSizes(format: string | null) {
  if (format === 'wide') {
    return { width: 1200, height: 630 };
  }
  return { width: 1080, height: 1920 };
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `bun test src/lib/share-card.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/share-card.ts src/lib/share-card.test.ts
git commit -m "$(cat <<'EOF'
feat: share-card copy stays anonymous unless the support is public

EOF
)"
```

---

### Task 8: Enregistrer `?src=` puis l'enlever

**Files:**
- Modify: `src/server/db/schema/link-view.ts`
- Modify: `src/server/db/utils/link-view.ts` (`recordLinkView`)
- Modify: `src/server/api/schemas/profile-link.ts` (`GetByLinkSchema`)
- Modify: `src/server/api/routers/profile-link.ts` (`getByLink`)
- Modify: `src/app/[link]/page.tsx`
- Create: `src/app/[link]/_components/strip-view-source.tsx`
- Modify: statistiques — `src/server/db/utils/link-click.ts` et `src/components/dashboard/analytics.tsx`

**Interfaces:**
- Consumes: `parseViewSource`.
- Produces: `link_view.source` text nullable. `recordLinkView` accepte `source?: ViewSource | null`. `GetByLinkSchema` accepte `src: z.string().optional()`. Seule la valeur blanche est écrite. Les autres appels `getByLink({ link })` restent valides.

- [ ] **Step 1: Colonne et migration** `link_view_source`.

- [ ] **Step 2: Enregistrement**

`getByLink` lit `parseViewSource(input.src)` et le passe à `recordLinkView`. La page serveur `app/[link]/page.tsx` reçoit `searchParams` et appelle `getByLink({ link, src })` une fois. Un composant client `StripViewSource` fait `history.replaceState` pour retirer `src` (et rien d'autre) après le premier rendu, afin que le partage du lien de la fiche ne réémette pas la source.

- [ ] **Step 3: Statistique**

Ajouter `countShareCardViews(linkId, days)` : `count(*)` où `source = 'carte'` et `createdAt` dans la fenêtre. L'exposer dans la requête d'analytics déjà utilisée par `analytics.tsx`, tuile « Visites venues des cartes de partage ». Pas de montant.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/link-view.ts src/server/db/utils/link-view.ts src/server/db/utils/link-click.ts src/server/api src/app/[link] src/components/dashboard/analytics.tsx src/server/db/drizzle
git commit -m "$(cat <<'EOF'
feat: record whitelisted visit sources from shared cards

EOF
)"
```

---

### Task 9: Image et bouton de partage

**Files:**
- Create: `src/app/api/og/support/[paymentId]/route.tsx`
- Create: `src/components/forms/share-support-card.tsx`
- Modify: `src/app/support/checkout/[paymentId]/page.tsx`
- Modify: `src/server/db/utils/support.ts` (`getCheckout`, seulement les champs nécessaires au bouton : `isPublic`, `displayName`, slug — pas pour les peindre sur la page de paiement au-delà du bouton)

**Interfaces:**
- Consumes: `shareCardHeadline`, `shareCardSizes`, `getCheckout` ou une requête dédiée `getShareCard(paymentId)`.
- Produces: `GET /api/og/support/[paymentId]?format=wide`. 404 si le paiement n'existe pas, n'est pas `success`, ou si la fiche est suspendue. Cache `public, max-age=86400`. Contenu : avatar dans un anneau, le titre, le titre d'objectif et le pourcentage seulement s'il y a un objectif actif (la tâche 12 peut laisser ces deux lignes vides jusqu'à la phase objectifs ; les ajouter dès que `personality.goal` existe, ou les omettre dans cette tâche et les brancher en tâche 13). Wordmark `AuraSpot` et `auraspot.me/{slug}`. Jamais de montant.

Le bouton n'est rendu que si `checkout.status === 'success'`.

`share-support-card.tsx` (`"use client"`) :

1. `navigator.canShare?.({ files: [file] })` puis `navigator.share({ files, text, url })`.
2. Sinon `window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url))` et un second bouton « Télécharger l’image ».
3. `url` = `https://auraspot.me/{slug}?src=carte` (utiliser `NEXT_PUBLIC_ROOT_DOMAIN` via le helper de `src/lib/site.ts`, pas une chaîne en dur si le helper existe).
4. `text` = le même titre que `shareCardHeadline`.

L'image est fetchée depuis `/api/og/support/${paymentId}` en blob pour le fichier partagé.

- [ ] **Step 1: Route**

`export const runtime = 'nodejs'`. Valider que `paymentId` est un UUID, sinon 404. Charger paiement + support + personnalité (nom, slug, image). Appliquer `shareCardHeadline`. `ImageResponse` avec les polices déjà chargées dans `src/app/api/og/route.tsx` (copier le `fetch` des fichiers `CalSans` et `Inter`).

- [ ] **Step 2: Bouton sur l'écran de succès**

Sous le message « Le paiement est reçu. Merci. ».

- [ ] **Step 3: Vérifier**

Paiement non `success` : `curl -I` sur la route → 404. Succès : 200 et `content-type` image. Au navigateur 375 px, le bouton est absent tant que le statut n'est pas succès. Le partage fichier ne se teste pas dans un navigateur de bureau : vérifier le repli « Télécharger l’image » et le lien `wa.me`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/og/support src/components/forms/share-support-card.tsx src/app/support/checkout src/server/db/utils/support.ts
git commit -m "$(cat <<'EOF'
feat: share a support card after a successful payment

EOF
)"
```

---

### Task 10: Pourcentage d'objectif

**Files:**
- Create: `src/lib/support-goal.ts`
- Create: `src/lib/support-goal.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `MIN_GOAL_AMOUNT = 10_000`
  - `MAX_GOAL_AMOUNT = 50_000_000`
  - `goalDisplayPercent(collected: number, target: number): number`

`collected` est déjà le net des paiements `success` (un remboursement n'est plus `success`, donc le total baisse avant l'appel). La fonction ne connaît pas les paiements.

- [ ] **Step 1: Tests (échouent)**

```ts
import { describe, expect, test } from 'bun:test';
import {
  MAX_GOAL_AMOUNT,
  MIN_GOAL_AMOUNT,
  goalDisplayPercent,
} from './support-goal';

describe('goalDisplayPercent', () => {
  test('arrondit à l’unité inférieure', () => {
    expect(goalDisplayPercent(1999, 10_000)).toBe(19);
  });

  test('plafonne l’affichage à 100', () => {
    expect(goalDisplayPercent(80_000, 50_000)).toBe(100);
  });

  test('baisse quand le collecté baisse', () => {
    expect(goalDisplayPercent(5000, 10_000)).toBe(50);
    expect(goalDisplayPercent(0, 10_000)).toBe(0);
  });

  test('reste à 0 si la cible est nulle', () => {
    expect(goalDisplayPercent(1000, 0)).toBe(0);
  });
});

describe('goal amount bounds', () => {
  test('borne le montant cible', () => {
    expect(MIN_GOAL_AMOUNT).toBe(10_000);
    expect(MAX_GOAL_AMOUNT).toBe(50_000_000);
  });
});
```

- [ ] **Step 2: Échec puis implémentation**

```ts
export const MIN_GOAL_AMOUNT = 10_000;
export const MAX_GOAL_AMOUNT = 50_000_000;

export function goalDisplayPercent(collected: number, target: number) {
  if (target <= 0) {
    return 0;
  }
  const percent = Math.floor((Math.max(0, collected) * 100) / target);
  return Math.min(100, percent);
}
```

Run: `bun test src/lib/support-goal.test.ts` — d'abord FAIL, ensuite PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/support-goal.ts src/lib/support-goal.test.ts
git commit -m "$(cat <<'EOF'
feat: public goal progress is a capped percentage

EOF
)"
```

---

### Task 11: Table `support_goal` et `support.goalId`

**Files:**
- Modify: `src/server/db/schema/support.ts`
- Create: migration `support_goal`

**Interfaces:**
- Consumes: `link.id`.
- Produces: table `supportGoal` (`support_goal`) et colonne `support.goalId`.

Colonnes, dans l'ordre de la spec : `id`, `personalityId` → `link.id` cascade, `title`, `description`, `targetAmount`, `status` `'active' | 'closed'`, `endsAt`, `closedAt`, `createdAt`. Ajouter `reachedNotifiedAt` timestamp nullable : sert à n'envoyer l'e-mail « objectif atteint » qu'une fois (tâche 14). Index unique partiel :

```ts
uniqueIndex('support_goal_one_active_idx')
  .on(table.personalityId)
  .where(sql`${table.status} = 'active'`),
```

`support.goalId` : `uuid('goal_id').references(() => supportGoal.id, { onDelete: 'set null' })`. Déclarer `supportGoal` avant `support` dans le fichier, ou utiliser une référence paresseuse si l'ordre actuel de `support` doit rester. Relations Drizzle des deux côtés.

- [ ] **Step 1: Schéma et `bun run db:generate`**

Vérifier le SQL : table, index unique partiel, colonne nullable, `on delete set null`.

- [ ] **Step 2: Commit**

```bash
git add src/server/db/schema/support.ts src/server/db/drizzle
git commit -m "$(cat <<'EOF'
feat: add one active support goal per fiche

EOF
)"
```

---

### Task 12: Créer, clôturer, progresser

**Files:**
- Modify: `src/server/api/schemas/personality.ts` (ou `support.ts` si les schémas personnalité n'acceptent pas ces formes — préférer `src/server/api/schemas/personality.ts`)
- Modify: `src/server/api/routers/personality.ts`
- Modify: `src/server/db/utils/support.ts` (`createSupportCheckout`, `applyPaymentEvent`)
- Modify: `src/server/db/utils/recurring.ts`
- Modify: `src/lib/redis.ts` seulement si un helper d'invalidation existe ; sinon appeler `redis.del` comme `link-view.ts`.

**Interfaces:**
- Consumes: `goalDisplayPercent`, `MIN_GOAL_AMOUNT`, `MAX_GOAL_AMOUNT`, `isProfileLinkEditor`, `canReceiveSupport`.
- Produces:
  - `personality.goal` public : `{ id, title, description, targetAmount, percent, supporters, endsAt } | null`. `supporters` = nombre de `support` distincts avec paiement `success` et ce `goalId`. Pas de total FCFA.
  - `personality.createGoal` gestionnaire. Refus `CONFLICT` si l'index unique partiel rejette l'insert. Zod : titre 1–80, description 0–280 optionnelle, `targetAmount` entier entre les bornes, `endsAt` date future optionnelle.
  - `personality.closeGoal` gestionnaire. Passe `status` à `closed`, `closedAt` à maintenant.
  - `personality.goalTotal` gestionnaire : `{ total: number }` en XAF, somme des `payment.amount` où `status = 'success'` et `support.goalId` est cet objectif.
  - À l'insert d'un `support` (don et renouvellement), `goalId` = l'objectif `active` de la fiche à cet instant, sinon `null`. Un objectif clôturé ensuite ne détache pas les dons déjà liés.
  - Cache Redis `support-goal:${goalId}`, TTL 300 secondes, sur le couple `{ collected, supporters }` qui sert au pourcentage. `applyPaymentEvent` supprime cette clé quand le paiement change de statut et que le `support.goalId` est non nul.

`runRecurringRenewals` (ou une fonction appelée juste après dans la même route cron) clôt les objectifs `active` dont `endsAt < now()` : `status = 'closed'`, `closedAt = endsAt`.

- [ ] **Step 1: Schémas zod et procédures**

Messages d'erreur en français : « Un objectif est déjà en cours. », « Cette fiche est introuvable. »

- [ ] **Step 2: Attacher `goalId` dans les deux inserts `support`**

`createSupportCheckout` et le renouvellement de `recurring.ts`. Le renouvellement ne copie pas `message`.

- [ ] **Step 3: Invalidation**

Dans `applyPaymentEvent`, après l'écriture du statut, `redis.del(\`support-goal:${goalId}\`)` si `goalId` est présent. Le pourcentage relu ensuite repart de la somme SQL.

- [ ] **Step 4: Tests**

Les tests unitaires du pourcentage restent ceux de la tâche 10. Ajouter dans `src/lib/support-goal.test.ts` uniquement si une fonction pure nouvelle apparaît (par exemple `isGoalOpen`). Ne pas monter une base pour cette tâche.

- [ ] **Step 5: Commit**

```bash
git add src/server src/lib/redis.ts
git commit -m "$(cat <<'EOF'
feat: attach successful supports to the active goal

EOF
)"
```

---

### Task 13: Carte objectif sur la fiche et le don

**Files:**
- Create: `src/app/[link]/_components/support-goal-card.tsx`
- Modify: `src/app/[link]/page.tsx` (sous le hero)
- Modify: `src/components/forms/create-support.tsx` (rappel)
- Create: `src/app/[link]/objectifs/page.tsx`
- Modify: l'édition de fiche (`src/app/[link]/_components/`, là où `canEdit` affiche déjà des actions) — bouton « Lancer un objectif » et « Clôturer ».
- Modify: `src/app/api/og/support/[paymentId]/route.tsx` — ligne objectif si `goalId` du paiement pointe un objectif encore lisible (actif ou clôturé) : titre + pourcentage. Toujours pas de FCFA collectés. Le montant cible peut figurer, il est public.

**Interfaces:**
- Consumes: `personality.goal`, `personality.createGoal`, `personality.closeGoal`, `personality.goalTotal` (ce dernier seulement dans l'écran gestionnaire, à côté du pourcentage).
- Produces: carte publique « Objectif » : titre, barre, `{percent} %`, nombre de soutiens, date de fin si elle existe. À 100 % : « Objectif atteint 🎉 ». Historique sur `/{slug}/objectifs` : objectifs `closed`, même carte sans bouton.

Le formulaire de création dit explicitement que le montant cible sera public. Rappel sur `/support/[slug]` : « Votre don compte pour : {titre} », au-dessus des montants, seulement s'il y a un objectif actif.

- [ ] **Step 1: Carte et formulaire**

Composant serveur pour la lecture. Formulaire client pour créer (titre, description, montant, date). Bouton clôturer visible seulement si `canEdit`.

- [ ] **Step 2: Vérifier au navigateur, 375 px**

Créer un objectif, voir la barre à 0 %, le rappel sur la page de don, la mention sur la carte OG d'un paiement `success` rattaché. Clôturer : la carte quitte la fiche et apparaît dans l'historique. Un second objectif actif est refusé.

- [ ] **Step 3: Commit**

```bash
git add src/app src/components/forms/create-support.tsx
git commit -m "$(cat <<'EOF'
feat: show the active support goal on the fiche

EOF
)"
```

---

### Task 14: E-mails

**Files:**
- Create: `src/components/emails/support-messages.tsx`
- Create: `src/components/emails/goal-reached.tsx`
- Create: `src/components/emails/support-thanked.tsx`
- Modify: `src/server/emails.ts` (le module qui envoie déjà via Resend — suivre `notifyRenewalRequested`)
- Modify: `src/server/db/schema/support.ts` — colonne `messageNotifiedAt` sur `support` (timestamp nullable)
- Modify: `src/app/api/cron/digest/route.ts` ou `recurring/route.ts` : le digest des messages part avec le cron quotidien déjà protégé par `CRON_SECRET`. Préférer `digest` s'il est déjà le courrier groupé, sinon `recurring` pour ne pas ajouter de tâche. La spec interdit une nouvelle tâche planifiée pour les objectifs ; les e-mails de messages réutilisent un cron existant.
- Modify: `support.thank` pour envoyer au fan.
- Modify: `applyPaymentEvent` pour envoyer `goal-reached` une fois.

**Interfaces:**
- Consumes: Resend, modèles existants (`support-renewal.tsx` pour le style inline).
- Produces:
  - Digest créateur, au plus un par jour et par fiche : « {n} nouveaux messages de vos soutiens ». Sélection : `message` non nul, `messageNotifiedAt` nul, paiement `success`, `isPublic`, pas masqué, créé depuis le dernier envoi. Après envoi, poser `messageNotifiedAt`. Destinataires : e-mails des gestionnaires (propriétaire du lien et `personality_manager`).
  - Fan remercié : si `support.userId` a un e-mail, envoyer « {prénom} vous remercie » avec `thankYouReply` s'il y en a une. Pas d'e-mail si le don est anonyme sans compte.
  - Objectif atteint : quand le pourcentage passe à 100 et `reachedNotifiedAt` est nul, e-mail aux gestionnaires puis poser `reachedNotifiedAt`. Un paiement suivant au-dessus de 100 % ne renvoie rien.

Aucun de ces e-mails n'inclut le montant d'un don. L'e-mail d'objectif peut indiquer le montant cible, qui est public, et le pourcentage.

- [ ] **Step 1: Migration `message_notified_at`**

- [ ] **Step 2: Trois composants et les fonctions d'envoi**

Même enveloppe visuelle que `support-renewal.tsx` (logo, carte blanche, 480 px). Sujets en français.

- [ ] **Step 3: Brancher thank, le cron, et le franchissement de 100 %**

Les échecs d'envoi ne doivent pas annuler le remerciement ni le paiement : `.catch` comme `notifyRenewalRequested`.

- [ ] **Step 4: Commit**

```bash
git add src/components/emails src/server src/app/api/cron src/server/db/drizzle
git commit -m "$(cat <<'EOF'
feat: email managers about new dedications and reached goals

EOF
)"
```

- [ ] **Step 5: Suite de tests**

Run: `bun run test`

Expected: PASS, y compris `dedication`, `share-card`, `support-goal`.

---

## Self-review

- Dédicaces : tâches 1–6 (schéma, création, liste, remerciement, masquage, édition, signalement, soutien rendu privé, remboursement via le filtre `success`).
- Carte : tâches 7–9 (texte, `?src=`, image, bouton, 404).
- Objectifs : tâches 10–13 (pourcentage, schéma, API, cache, cron de clôture, UI, historique, rappel sur le don).
- E-mails : tâche 14.
- Hors périmètre respecté : pas d'avantages mensuels, pas de « je couvre les frais », pas de classement, pas de modération automatique.
- Le renouvellement mensuel crée un `support` sans `message` (tâches 3 et 12).
