# Fiche personnalité AuraSpot — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la page publique héritée d'OpenBio (`/[slug]`) par la fiche personnalité « Aura » : hero centré, réseaux officiels, communauté, à propos, espace de blocs restylé, bouton Soutenir, deux colonnes sur grand écran.

**Architecture:** La page serveur `src/app/[link]/page.tsx` assemble des composants de section (un fichier par section dans `src/app/[link]/_components/`). Toutes les données viennent de `profileLink.getByLink`, enrichi de la catégorie, des réseaux, d'un aperçu des soutiens et d'un droit `canEdit` (propriétaire ou gestionnaire). La mise en page réagit à la largeur du conteneur (container queries Tailwind 4) pour que l'aperçu mobile du propriétaire reste juste.

**Tech Stack:** Next.js 16 App Router, tRPC 11 (`api` de `@/trpc/react`), Drizzle (Postgres), Tailwind CSS 4, shadcn/ui, Tiptap, react-grid-layout, lucide-react, react-icons.

**Spec:** `docs/superpowers/specs/2026-09-29-fiche-personnalite-design.md`

## Global Constraints

- Pas de tests automatisés (préférence utilisateur). Chaque tâche se vérifie par `bun run typecheck`, `bunx biome check --write <fichiers touchés>` et, quand c'est visible, dans le navigateur sur `http://localhost:3000/<slug>`.
- Utiliser `bun`, jamais npm.
- Textes de l'interface en français, avec les accents et l'apostrophe typographique `’`.
- Aucun montant de soutien ne sort de `profileLink.getByLink`.
- Dégradé AuraSpot : `#FDBA8C → #F75FC0 → #B43CF0 → #5B6CFF`, halo `#FF7AD9 / #B15CFF / #3FD8FF`. Typo de marque : Outfit 700.
- Messages de commit en anglais, style `feat:` / `refactor:`, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Précisions par rapport à la spec

- **Deux colonnes** : déclenchées par la largeur du conteneur (`@4xl`, 56 rem) plutôt que par le breakpoint écran `md`. À `md` (768 px) la colonne de droite serait trop étroite pour la grille 4 colonnes, et l'aperçu mobile du propriétaire doit rester en une colonne même sur un grand écran.
- **Bio** : éditée dans son propre composant `profile-about.tsx` (section « À propos »), pas dans le hero, puisque la spec la place dans la colonne de droite.

## Review Focus

1. Un gestionnaire (ligne `personality_manager`) qui n'est pas `link.userId` doit pouvoir modifier nom, bio, avatar, détails, réseaux et blocs, mais pas supprimer la fiche.
2. Un visiteur anonyme ne doit jamais voir les boutons d'édition, la ligne de statistiques, ni recevoir `monthlyViews`.
3. Aperçu mobile du propriétaire sur grand écran : une colonne, bouton Soutenir collé en bas masqué tant que l'édition est active.
4. Fiche sans photo, sans catégorie, sans lieu, sans réseau, sans bio, sans bloc, sans soutien : la page reste propre (hero, communauté, bouton Soutenir).
5. Noms de soutiens en double (le même nom sur plusieurs soutiens) : un seul avatar par nom, compteur inchangé.

Ces cas sont vérifiés dans la Tâche 12.

---

## Carte des fichiers

| Fichier | Action | Responsabilité |
| --- | --- | --- |
| `src/app/layout.tsx` | Modifier | Charger Outfit en variable `--font-outfit` |
| `src/styles/globals.css` | Modifier | Token `font-brand`, classes `aura-*`, restylage des blocs |
| `src/components/brand.tsx` | Modifier | Utiliser `font-brand` au lieu de charger Outfit |
| `src/lib/personality.ts` | Modifier | `firstNameOf`, `initialsOf`, `supportersSummary` |
| `src/server/db/utils/link.ts` | Modifier | `isProfileLinkEditor`, `assertCanEditProfileLink`, champs `categoryId` / `location` |
| `src/server/db/utils/link-view.ts` | Modifier | `getProfileLinkViewsSince` |
| `src/server/db/utils/support.ts` | Modifier | `getSupportersPreview` |
| `src/server/db/utils/personality.ts` | Modifier | `getProfileDetails`, `replaceSocialLinks` |
| `src/server/api/schemas/profile-link.ts` | Modifier | `UpdateLinkDetailsSchema`, `SetSocialLinksSchema` |
| `src/server/api/routers/profile-link.ts` | Modifier | `getByLink` enrichi, `canEdit`, `updateDetails`, `setSocialLinks` |
| `src/app/api/upload/route.ts` | Modifier | Autoriser les gestionnaires |
| `src/app/[link]/_components/avatar.tsx` | Réécrire | Avatar dans l'anneau Aura |
| `src/app/[link]/_components/profile-hero.tsx` | Créer | Hero |
| `src/app/[link]/_components/edit-details-dialog.tsx` | Créer | Modal catégorie et lieu |
| `src/app/[link]/_components/profile-about.tsx` | Créer | Section À propos (bio Tiptap) |
| `src/app/[link]/_components/profile-top-bar.tsx` | Créer | Barre du haut |
| `src/app/[link]/_components/official-socials.tsx` | Créer | Réseaux officiels |
| `src/app/[link]/_components/edit-socials-dialog.tsx` | Créer | Modal d'édition des réseaux |
| `src/app/[link]/_components/community.tsx` | Créer | Mur des soutiens |
| `src/app/[link]/_components/profile-space.tsx` | Créer | Section « Espace de … » |
| `src/app/[link]/_components/support-button.tsx` | Créer | Bouton Soutenir (collé ou intégré) |
| `src/app/[link]/_components/profile-footer.tsx` | Créer | Pied de page |
| `src/app/[link]/_components/bento.tsx`, `bento-layout.tsx` | Modifier | `canEdit` |
| `src/app/[link]/_components/action-bar.tsx` | Modifier | Style de la barre |
| `src/app/[link]/_components/viewport-container.tsx` | Modifier | Largeur ordinateur |
| `src/app/[link]/page.tsx`, `layout.tsx`, `loading.tsx` | Modifier | Assemblage et squelette |
| `src/app/[link]/_components/header.tsx`, `profile-public-meta.tsx` | Supprimer | Remplacés |

---

### Task 1: Fondations (police, helpers, styles Aura)

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/styles/globals.css`
- Modify: `src/components/brand.tsx`
- Modify: `src/lib/personality.ts`

**Interfaces:**
- Produces: classe Tailwind `font-brand` ; classes CSS `aura-halo`, `aura-ring`, `aura-chip`, `aura-cta`, `aura-space` ; variable CSS `--aura-accent` (facultative) ; fonctions `firstNameOf(name: string): string`, `initialsOf(name: string): string`, `supportersSummary(input: { names: string[]; count: number; firstName: string }): string`.

- [ ] **Step 1: Charger Outfit dans le layout racine**

Dans `src/app/layout.tsx`, remplacer l'import des polices Google et ajouter Outfit :

```tsx
import { Geist, Outfit } from 'next/font/google';
```

Après la déclaration `const calSans = LocalFont({...});`, ajouter :

```tsx
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-outfit',
});
```

Et remplacer la classe du `<body>` :

```tsx
<body className={`${geist.variable} ${calSans.variable} ${outfit.variable} font-sans`}>
```

- [ ] **Step 2: Token de police et classes Aura**

Dans `src/styles/globals.css`, dans le bloc `@theme` qui contient `--font-cal`, ajouter juste après la ligne `--font-cal: ...` :

```css
  --font-brand: var(--font-outfit, "Outfit"), sans-serif;
```

Puis ajouter à la fin du fichier :

```css
/* ---- AuraSpot profile ---- */
.aura-halo {
  background: radial-gradient(
    circle at 50% 42%,
    color-mix(in oklab, var(--aura-accent, #f75fc0) 34%, transparent),
    color-mix(in oklab, #b43cf0 18%, transparent) 40%,
    color-mix(in oklab, #3fd8ff 12%, transparent) 60%,
    transparent 72%
  );
  filter: blur(14px);
}

.aura-ring {
  background: linear-gradient(
    145deg,
    #fdba8c 0%,
    var(--aura-accent, #f75fc0) 38%,
    #b43cf0 72%,
    #5b6cff 100%
  );
}

.aura-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 9999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  background: color-mix(in oklab, var(--foreground) 6%, transparent);
  color: color-mix(in oklab, var(--foreground) 80%, transparent);
}

.aura-cta {
  background: linear-gradient(
    100deg,
    var(--aura-accent, #f75fc0),
    #b43cf0 55%,
    #5b6cff
  );
  color: #fff;
}

/* Restyle every bento card root (they all share rounded-2xl + border + bg-card). */
.aura-space .react-grid-item .rounded-2xl.border.bg-card {
  border-radius: 1.25rem;
  border-color: color-mix(in oklab, var(--foreground) 8%, transparent);
  box-shadow:
    0 1px 2px color-mix(in oklab, var(--foreground) 5%, transparent),
    0 8px 24px -12px color-mix(in oklab, #b43cf0 25%, transparent);
}

.aura-space .react-grid-item .font-cal {
  font-family: var(--font-brand);
  font-weight: 700;
}
```

- [ ] **Step 3: Le wordmark utilise le token**

Dans `src/components/brand.tsx`, supprimer l'import `import { Outfit } from 'next/font/google';` et la ligne `const outfit = Outfit({ subsets: ['latin'], weight: '700' });`. Dans `Wordmark`, remplacer `outfit.className,` par `'font-brand font-bold',`.

- [ ] **Step 4: Helpers texte**

Dans `src/lib/personality.ts`, ajouter à la suite des autres constantes regex (en haut du fichier, avec `DIACRITICS_RE`…) :

```ts
const WHITESPACE_RE = /\s+/;
```

Et ajouter à la fin du fichier :

```ts
export function firstNameOf(name: string): string {
  const trimmed = name.trim();
  const [first] = trimmed.split(WHITESPACE_RE);
  if (!first || first === trimmed || first.length < 3) {
    return trimmed;
  }
  return first;
}

export function initialsOf(name: string): string {
  const words = name.trim().split(WHITESPACE_RE).filter(Boolean);
  const first = words[0] ?? '';
  const last = words.length > 1 ? (words.at(-1) ?? '') : '';
  const letters = last ? `${first[0] ?? ''}${last[0] ?? ''}` : first.slice(0, 2);
  return letters.toUpperCase() || '?';
}

function others(n: number) {
  return n === 1 ? '1 autre' : `${n} autres`;
}

export function supportersSummary({
  names,
  count,
  firstName,
}: {
  names: string[];
  count: number;
  firstName: string;
}): string {
  if (count === 0) {
    return `Soyez le premier à soutenir ${firstName}`;
  }
  const [a, b] = names;
  if (!a) {
    return count === 1 ? '1 soutien' : `${count} soutiens`;
  }
  if (!b) {
    return count === 1 ? `${a} soutient ${firstName}` : `${a} et ${others(count - 1)}`;
  }
  const rest = count - 2;
  return rest <= 0 ? `${a} et ${b}` : `${a}, ${b} et ${others(rest)}`;
}
```

- [ ] **Step 5: Vérifier**

Run: `bun run typecheck`
Expected: aucune erreur.

Run: `bunx biome check --write src/app/layout.tsx src/styles/globals.css src/components/brand.tsx src/lib/personality.ts`
Expected: aucune erreur (les avertissements existants ailleurs sont hors périmètre).

Ouvrir `http://localhost:3000/` : le wordmark de la navbar s'affiche toujours en Outfit.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/styles/globals.css src/components/brand.tsx src/lib/personality.ts
git commit -m "feat: brand font token, aura styles and profile text helpers"
```

---

### Task 2: Droit de modification (propriétaire ou gestionnaire)

**Files:**
- Modify: `src/server/db/utils/link.ts`
- Modify: `src/server/api/routers/profile-link.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/[link]/page.tsx`, `src/app/[link]/_components/avatar.tsx`, `bento.tsx`, `bento-layout.tsx`, `header.tsx`, `profile-public-meta.tsx`

**Interfaces:**
- Produces: `isProfileLinkEditor(userId: string, profileLink: { id: string; userId: string }): Promise<boolean>` ; `assertCanEditProfileLink(input: { userId: string; linkId?: string; link?: string }): Promise<InferSelectModel<typeof link>>` ; `getByLink` renvoie `canEdit: boolean` et **n'a plus** `isOwner`.

- [ ] **Step 1: Helpers serveur**

Dans `src/server/db/utils/link.ts`, remplacer `import { link } from '../schema';` par :

```ts
import { link, personalityManager } from '../schema';
```

Ajouter après `canModifyProfileLink` :

```ts
export const isProfileLinkEditor = async (
  userId: string,
  profileLink: { id: string; userId: string }
) => {
  if (profileLink.userId === userId) {
    return true;
  }

  const manager = await db.query.personalityManager.findFirst({
    where: (table, { and, eq: equals }) =>
      and(
        equals(table.personalityId, profileLink.id),
        equals(table.userId, userId)
      ),
    columns: { id: true },
  });

  return Boolean(manager);
};

export const assertCanEditProfileLink = async ({
  userId,
  linkId,
  link: linkSlug,
}: {
  userId: string;
  linkId?: string;
  link?: string;
}) => {
  let profileLink: InferSelectModel<typeof link> | undefined | null = null;
  if (linkId) {
    profileLink = await getProfileLinkById(linkId);
  } else if (linkSlug) {
    profileLink = await getProfileLinkByLink(linkSlug);
  }

  if (!(profileLink && (await isProfileLinkEditor(userId, profileLink)))) {
    throw new Error("You can't modify this profile link");
  }

  return profileLink;
};
```

`personalityManager` est bien exporté par `src/server/db/schema/index.ts` (via `./personality`). `canModifyProfileLink` reste inchangé : il protège la suppression, réservée au propriétaire.

- [ ] **Step 2: Routeur**

Dans `src/server/api/routers/profile-link.ts` :

1. Dans l'import depuis `'@/server/db'`, ajouter `assertCanEditProfileLink,` et `isProfileLinkEditor,` (ordre alphabétique : Biome les triera).
2. Dans les procédures `update`, `createBento`, `deleteBento` et `updateBento`, remplacer `await canModifyProfileLink({` par `await assertCanEditProfileLink({` (arguments inchangés). **Ne pas** toucher à `delete`.
3. Dans `getByLink`, remplacer le `return { ...profileLink, isOwner: ..., isPremium: true };` par :

```ts
      const canEdit = authedUserId
        ? await isProfileLinkEditor(authedUserId, profileLink)
        : false;

      return {
        ...profileLink,
        canEdit,
        isPremium: true,
      };
```

- [ ] **Step 3: Upload d'avatar**

Dans `src/app/api/upload/route.ts`, remplacer `import { db, eq } from '@/server/db';` par :

```ts
import { db, eq, isProfileLinkEditor } from '@/server/db';
```

Remplacer la lecture et le contrôle :

```ts
  const profileLink = await db.query.link.findFirst({
    where: (l, { eq }) => eq(l.id, profileLinkId),
    columns: { id: true, image: true, userId: true },
  });

  if (
    !(profileLink && (await isProfileLinkEditor(session.user.id, profileLink)))
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
```

- [ ] **Step 4: Renommer `isOwner` en `canEdit` côté client**

Run: `sed -i 's/profileLink\.isOwner/profileLink.canEdit/g; s/profileLink?\.isOwner/profileLink?.canEdit/g' "src/app/[link]/page.tsx" "src/app/[link]/_components/avatar.tsx" "src/app/[link]/_components/bento.tsx" "src/app/[link]/_components/bento-layout.tsx" "src/app/[link]/_components/header.tsx"`

Dans `src/app/[link]/page.tsx`, la prop passée à `ProfilePublicMeta` devient `isOwner={profileLink.canEdit}` (déjà fait par le sed) : ne pas renommer la prop du composant, il sera supprimé en Tâche 11.

- [ ] **Step 5: Vérifier**

Run: `grep -rn "isOwner" src --include=*.ts --include=*.tsx`
Expected: seulement `profile-public-meta.tsx` (nom de prop local) et la ligne `isOwner={profileLink.canEdit}` de `page.tsx`.

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write src/server/db/utils/link.ts src/server/api/routers/profile-link.ts src/app/api/upload/route.ts "src/app/[link]"` → aucune erreur.

Navigateur : connecté comme propriétaire, `http://localhost:3000/<slug>` affiche toujours la barre d'édition ; en navigation privée, elle n'apparaît pas.

- [ ] **Step 6: Commit**

```bash
git add src/server/db/utils/link.ts src/server/api/routers/profile-link.ts src/app/api/upload/route.ts "src/app/[link]"
git commit -m "feat: let personality managers edit the profile they manage"
```

---

### Task 3: Données de la fiche

**Files:**
- Modify: `src/server/db/utils/link-view.ts`
- Modify: `src/server/db/utils/support.ts`
- Modify: `src/server/db/utils/personality.ts`
- Modify: `src/server/api/routers/profile-link.ts`

**Interfaces:**
- Consumes: `canEdit` (Tâche 2).
- Produces: `getByLink` renvoie en plus `category: { id: string; name: string; slug: string } | null`, `socialLinks: { id: string; platform: string; url: string; label: string | null; sortOrder: number }[]`, `supporters: { count: number; recent: { displayName: string }[] }`, `monthlyViews?: number` (présent seulement si `canEdit`).

- [ ] **Step 1: Vues sur 30 jours**

Dans `src/server/db/utils/link-view.ts`, ajouter après `getProfileLinkViews` (les imports `and`, `gte`, `sql`, `eq` existent déjà) :

```ts
export const getProfileLinkViewsSince = async (linkId: string, days: number) => {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(linkView)
    .where(and(eq(linkView.linkId, linkId), gte(linkView.createdAt, since)));

  return Number(rows[0]?.count ?? 0);
};
```

- [ ] **Step 2: Aperçu des soutiens**

Dans `src/server/db/utils/support.ts`, remplacer `import { and, eq } from 'drizzle-orm';` par :

```ts
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
```

Ajouter à la fin du fichier :

```ts
export const getSupportersPreview = async (
  personalityId: string,
  limit = 5
) => {
  const succeeded = and(
    eq(support.personalityId, personalityId),
    eq(payment.status, 'success')
  );

  const [countRows, publicRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(distinct ${support.id})` })
      .from(support)
      .innerJoin(payment, eq(payment.supportId, support.id))
      .where(succeeded),
    db
      .select({ displayName: support.displayName })
      .from(support)
      .innerJoin(payment, eq(payment.supportId, support.id))
      .where(
        and(succeeded, eq(support.isPublic, true), isNotNull(support.displayName))
      )
      .orderBy(desc(support.createdAt))
      .limit(limit * 4),
  ]);

  const names = [
    ...new Set(
      publicRows.flatMap((row) =>
        row.displayName?.trim() ? [row.displayName.trim()] : []
      )
    ),
  ].slice(0, limit);

  return {
    count: Number(countRows[0]?.count ?? 0),
    recent: names.map((displayName) => ({ displayName })),
  };
};
```

- [ ] **Step 3: Catégorie et réseaux**

Dans `src/server/db/utils/personality.ts`, ajouter après `getPublicPersonalityBySlug` :

```ts
export const getProfileDetails = async (linkId: string) => {
  const row = await db.query.link.findFirst({
    where: (table, { eq: equals }) => equals(table.id, linkId),
    columns: { id: true },
    with: {
      category: { columns: { id: true, name: true, slug: true } },
      socialLinks: {
        columns: {
          id: true,
          platform: true,
          url: true,
          label: true,
          sortOrder: true,
        },
        orderBy: (table, { asc }) => asc(table.sortOrder),
      },
    },
  });

  return {
    category: row?.category ?? null,
    socialLinks: row?.socialLinks ?? [],
  };
};
```

- [ ] **Step 4: Enrichir `getByLink`**

Dans `src/server/api/routers/profile-link.ts`, ajouter aux imports :

```ts
import { getSupportersPreview } from '@/server/db/utils/support';
```

et, dans l'import depuis `'@/server/db'`, `getProfileDetails,` et `getProfileLinkViewsSince,`.

Remplacer le `return` de `getByLink` (écrit en Tâche 2) par :

```ts
      const [details, supporters, monthlyViews] = await Promise.all([
        getProfileDetails(profileLink.id),
        getSupportersPreview(profileLink.id),
        canEdit
          ? getProfileLinkViewsSince(profileLink.id, 30)
          : Promise.resolve(undefined),
      ]);

      return {
        ...profileLink,
        ...details,
        supporters,
        ...(monthlyViews === undefined ? {} : { monthlyViews }),
        canEdit,
        isPremium: true,
      };
```

- [ ] **Step 5: Vérifier**

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write src/server/db/utils/link-view.ts src/server/db/utils/support.ts src/server/db/utils/personality.ts src/server/api/routers/profile-link.ts` → aucune erreur.

Navigateur, en navigation privée : ouvrir `http://localhost:3000/<slug>`, puis dans les outils réseau la requête `profileLink.getByLink` : la réponse contient `category`, `socialLinks`, `supporters`, **pas** `monthlyViews`, et aucun champ `amount`.

- [ ] **Step 6: Commit**

```bash
git add src/server/db/utils/link-view.ts src/server/db/utils/support.ts src/server/db/utils/personality.ts src/server/api/routers/profile-link.ts
git commit -m "feat: expose category, socials, supporters preview and views on profile"
```

---

### Task 4: Mutations d'édition (détails et réseaux)

**Files:**
- Modify: `src/server/db/utils/link.ts`
- Modify: `src/server/db/utils/personality.ts`
- Modify: `src/server/api/schemas/profile-link.ts`
- Modify: `src/server/api/routers/profile-link.ts`

**Interfaces:**
- Consumes: `assertCanEditProfileLink` (Tâche 2), `toSocialUrl`, `PERSONALITY_PLATFORMS` (`src/lib/personality.ts`).
- Produces: `api.profileLink.updateDetails.useMutation()` avec l'entrée `{ id: string; categoryId: string | null; location: string | null }` ; `api.profileLink.setSocialLinks.useMutation()` avec `{ id: string; links: { platform: PersonalityPlatform; value: string }[] }`.

- [ ] **Step 1: `updateProfileLink` accepte catégorie et lieu**

Dans `src/server/db/utils/link.ts`, dans le type du paramètre de `updateProfileLink`, ajouter :

```ts
  categoryId?: string | null;
  location?: string | null;
```

- [ ] **Step 2: Remplacer les réseaux**

Dans `src/server/db/utils/personality.ts`, remplacer `import { link, personalityClaim, personalityManager } from '../schema';` par :

```ts
import {
  link,
  personalityClaim,
  personalityManager,
  socialLink,
} from '../schema';
```

et ajouter :

```ts
export const replaceSocialLinks = async (
  personalityId: string,
  links: { platform: string; url: string }[]
) => {
  // neon-http has no transactions: delete then insert, links are cheap to rebuild.
  await db.delete(socialLink).where(eq(socialLink.personalityId, personalityId));
  if (links.length === 0) {
    return [];
  }
  return db
    .insert(socialLink)
    .values(
      links.map((item, index) => ({
        personalityId,
        platform: item.platform,
        url: item.url,
        sortOrder: index,
      }))
    )
    .returning({ id: socialLink.id });
};
```

- [ ] **Step 3: Schémas d'entrée**

Dans `src/server/api/schemas/profile-link.ts`, ajouter l'import :

```ts
import { PERSONALITY_PLATFORMS } from '@/lib/personality';
```

et à la fin :

```ts
export const UpdateLinkDetailsSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  location: z.string().trim().max(80).nullable(),
});

export const SetSocialLinksSchema = z.object({
  id: z.string().uuid(),
  links: z
    .array(
      z.object({
        platform: z.enum(PERSONALITY_PLATFORMS),
        value: z.string().trim().min(1).max(200),
      })
    )
    .max(12),
});
```

- [ ] **Step 4: Procédures**

Dans `src/server/api/routers/profile-link.ts` :
- ajouter `SetSocialLinksSchema,` et `UpdateLinkDetailsSchema,` à l'import depuis `'../schemas'` ;
- ajouter `replaceSocialLinks,` à l'import depuis `'@/server/db'` ;
- ajouter `import { toSocialUrl } from '@/lib/personality';` et `import { TRPCError } from '@trpc/server';`.

Ajouter ces deux procédures juste après `update` :

```ts
  updateDetails: protectedProcedure
    .input(UpdateLinkDetailsSchema)
    .mutation(async ({ input, ctx }) => {
      await assertCanEditProfileLink({ userId: ctx.user.id, linkId: input.id });

      return updateProfileLink({
        id: input.id,
        categoryId: input.categoryId,
        location: input.location || null,
      });
    }),

  setSocialLinks: protectedProcedure
    .input(SetSocialLinksSchema)
    .mutation(async ({ input, ctx }) => {
      await assertCanEditProfileLink({ userId: ctx.user.id, linkId: input.id });

      const links = input.links.map((item) => {
        const url = toSocialUrl(item.platform, item.value);
        if (!url) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Lien invalide pour ${item.platform} : ${item.value}`,
          });
        }
        return { platform: item.platform, url };
      });

      return replaceSocialLinks(input.id, links);
    }),
```

- [ ] **Step 5: Vérifier**

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write src/server/db/utils/link.ts src/server/db/utils/personality.ts src/server/api/schemas/profile-link.ts src/server/api/routers/profile-link.ts` → aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/server/db/utils/link.ts src/server/db/utils/personality.ts src/server/api/schemas/profile-link.ts src/server/api/routers/profile-link.ts
git commit -m "feat: profile mutations for category, location and official socials"
```

---

### Task 5: Avatar, hero et modal des détails

**Files:**
- Rewrite: `src/app/[link]/_components/avatar.tsx`
- Create: `src/app/[link]/_components/edit-details-dialog.tsx`
- Create: `src/app/[link]/_components/profile-hero.tsx`

**Interfaces:**
- Consumes: `canEdit`, `category`, `supporters`, `monthlyViews` (Tâches 2 et 3), `api.profileLink.updateDetails` (Tâche 4), `initialsOf` et classes `aura-*` (Tâche 1).
- Produces: `<ProfileHero profileLink={ProfileLinkData} />` (export par défaut).

- [ ] **Step 1: Avatar dans l'anneau**

Remplacer tout `src/app/[link]/_components/avatar.tsx` par :

```tsx
'use client';

import { toast } from '@/components/ui/use-toast';
import { initialsOf } from '@/lib/personality';
import { cn } from '@/lib/utils';
import type { RouterOutputs } from '@/trpc/react';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { type FileWithPath, useDropzone } from 'react-dropzone';
import { usePreview } from './preview-context';

type Props = {
  profileLink: NonNullable<RouterOutputs['profileLink']['getByLink']>;
};

export default function ProfileLinkAvatar({ profileLink }: Props) {
  const [img, setImg] = useState(profileLink.image);
  const { preview } = usePreview();
  const isEditable = profileLink.canEdit && !preview;

  const onDrop = useCallback(
    async (acceptedFiles: FileWithPath[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }

      setImg(URL.createObjectURL(file));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('profileLinkId', profileLink.id);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!(res.ok && data.url)) {
          throw new Error(data.error ?? 'Upload failed');
        }
        setImg(data.url);
      } catch (err) {
        toast({
          title: 'Photo non enregistrée',
          description: err instanceof Error ? err.message : 'Upload failed',
        });
        setImg(profileLink.image);
      }
    },
    [profileLink.id, profileLink.image]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [] },
    disabled: !isEditable,
  });

  return (
    <div className="aura-ring relative size-28 shrink-0 rounded-full p-1 @4xl:size-36">
      <div
        {...(isEditable ? getRootProps() : {})}
        className={cn(
          'group relative flex size-full items-center justify-center overflow-hidden rounded-full border-4 border-background bg-[color-mix(in_oklab,var(--aura-accent,#b43cf0)_28%,#1a1325)]',
          isEditable && 'cursor-pointer'
        )}
      >
        {img ? (
          <Image
            key={img}
            src={img}
            alt={profileLink.name}
            fill
            sizes="144px"
            priority
            unoptimized={img.startsWith('blob:')}
            className="object-cover"
          />
        ) : (
          <span className="font-brand font-bold text-3xl text-white @4xl:text-4xl">
            {initialsOf(profileLink.name)}
          </span>
        )}

        {isEditable && (
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6 text-white" />
            </div>
            <input {...getInputProps()} />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modal catégorie et lieu**

Créer `src/app/[link]/_components/edit-details-dialog.tsx` :

```tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { useParams } from 'next/navigation';
import { type ReactNode, useState } from 'react';

export default function EditDetailsDialog({
  profileLinkId,
  categoryId,
  location,
  children,
}: {
  profileLinkId: string;
  categoryId: string | null;
  location: string | null;
  children: ReactNode;
}) {
  const { link } = useParams<{ link: string }>();
  const [open, setOpen] = useState(false);
  const [nextCategoryId, setNextCategoryId] = useState(categoryId ?? '');
  const [nextLocation, setNextLocation] = useState(location ?? '');
  const utils = api.useUtils();

  const { data: categories } = api.personality.categories.useQuery(undefined, {
    enabled: open,
  });

  const { mutate, isPending } = api.profileLink.updateDetails.useMutation({
    onSuccess: async () => {
      await utils.profileLink.getByLink.invalidate({ link });
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Enregistrement impossible', description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Catégorie et lieu</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutate({
              id: profileLinkId,
              categoryId: nextCategoryId || null,
              location: nextLocation.trim() || null,
            });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-category">Catégorie</Label>
            <select
              id="profile-category"
              value={nextCategoryId}
              onChange={(event) => setNextCategoryId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Aucune</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-location">Lieu</Label>
            <Input
              id="profile-location"
              value={nextLocation}
              onChange={(event) => setNextLocation(event.target.value)}
              maxLength={80}
              placeholder="Brazzaville"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Hero**

Créer `src/app/[link]/_components/profile-hero.tsx` :

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { type RouterOutputs, api } from '@/trpc/react';
import { AlertTriangle, BarChart3, MapPin, Pencil, Tag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ProfileLinkAvatar from './avatar';
import EditDetailsDialog from './edit-details-dialog';
import PersonalityVerificationBadge from './personality-verification-badge';
import { usePreview } from './preview-context';

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

export default function ProfileHero({
  profileLink: initialData,
}: {
  profileLink: ProfileLinkData;
}) {
  const { link } = useParams<{ link: string }>();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link },
    { initialData, staleTime: 60_000 }
  );
  const { preview } = usePreview();
  const { mutate: updateProfileLink } = api.profileLink.update.useMutation();

  const [name, setName] = useState(initialData.name);
  const lastSavedName = useRef(initialData.name);
  const isEditable = Boolean(profileLink?.canEdit) && !preview;

  useEffect(() => {
    const trimmed = name.trim();
    if (!(isEditable && trimmed) || trimmed === lastSavedName.current) {
      return;
    }
    const timer = setTimeout(() => {
      lastSavedName.current = trimmed;
      updateProfileLink({ id: initialData.id, name: trimmed });
    }, 800);
    return () => clearTimeout(timer);
  }, [isEditable, name, initialData.id, updateProfileLink]);

  if (!profileLink) {
    return null;
  }

  const { category, location, supporters } = profileLink;

  return (
    <section
      data-tour="profile-header"
      className="relative flex flex-col items-center gap-4 text-center @4xl:items-start @4xl:text-left"
    >
      <div
        aria-hidden="true"
        className="aura-halo -z-10 -inset-x-20 -top-28 pointer-events-none absolute h-96"
      />

      {profileLink.status === 'suspended' && profileLink.canEdit && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          Fiche suspendue : elle n’est plus visible du public.
        </p>
      )}

      <ProfileLinkAvatar profileLink={profileLink} />

      <div className="flex max-w-full items-center gap-2">
        {isEditable ? (
          <input
            aria-label="Nom"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            size={Math.max(name.length, 1)}
            className="min-w-0 max-w-full bg-transparent text-center font-bold font-brand text-3xl leading-tight outline-none @4xl:text-left @4xl:text-4xl"
          />
        ) : (
          <h1 className="break-words font-bold font-brand text-3xl leading-tight @4xl:text-4xl">
            {profileLink.name}
          </h1>
        )}
        {profileLink.verificationStatus === 'verified' && (
          <PersonalityVerificationBadge />
        )}
      </div>

      {(category || location || isEditable) && (
        <div className="flex flex-wrap items-center justify-center gap-2 @4xl:justify-start">
          {category && (
            <span className="aura-chip">
              <Tag className="size-3.5" />
              {category.name}
            </span>
          )}
          {location && (
            <span className="aura-chip">
              <MapPin className="size-3.5" />
              {location}
            </span>
          )}
          {isEditable && (
            <EditDetailsDialog
              profileLinkId={profileLink.id}
              categoryId={category?.id ?? null}
              location={location}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-full px-2.5 text-xs"
              >
                <Pencil className="mr-1 size-3.5" />
                {category || location ? 'Modifier' : 'Catégorie et lieu'}
              </Button>
            </EditDetailsDialog>
          )}
        </div>
      )}

      {supporters.count > 0 && (
        <p className="text-muted-foreground text-sm">
          <span className="font-bold font-brand text-foreground text-lg">
            {supporters.count.toLocaleString('fr-FR')}
          </span>{' '}
          {supporters.count === 1 ? 'soutien' : 'soutiens'}
        </p>
      )}

      {profileLink.claimStatus === 'unclaimed' && (
        <p className="text-muted-foreground text-xs">
          Fiche non revendiquée · C’est vous ?{' '}
          <Link
            href={`/claim/${profileLink.link}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Revendiquer
          </Link>
        </p>
      )}

      {profileLink.canEdit && profileLink.monthlyViews !== undefined && (
        <Link
          href={`/app/analytics/${profileLink.id}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
        >
          <BarChart3 className="size-3.5" />
          {profileLink.monthlyViews.toLocaleString('fr-FR')} visites ce mois ·
          Voir les statistiques
        </Link>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `bun run typecheck` → aucune erreur (le hero n'est pas encore monté ; `header.tsx` utilise toujours `ProfileLinkAvatar`, dont les props n'ont pas changé).
Run: `bunx biome check --write "src/app/[link]/_components/avatar.tsx" "src/app/[link]/_components/edit-details-dialog.tsx" "src/app/[link]/_components/profile-hero.tsx"` → aucune erreur.

Navigateur : sur `http://localhost:3000/<slug>`, l'avatar actuel (encore dans l'ancien en-tête) apparaît déjà dans l'anneau dégradé.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[link]/_components/avatar.tsx" "src/app/[link]/_components/edit-details-dialog.tsx" "src/app/[link]/_components/profile-hero.tsx"
git commit -m "feat: aura hero with ring avatar and category/location editor"
```

---

### Task 6: Section À propos

**Files:**
- Create: `src/app/[link]/_components/profile-about.tsx`

**Interfaces:**
- Consumes: `canEdit` ; `BioToolbar` (`./bio-toolbar`, props `editor`, `name`, `links`) inchangé.
- Produces: `<ProfileAbout profileLink={ProfileLinkData} />`.

- [ ] **Step 1: Créer le composant**

Créer `src/app/[link]/_components/profile-about.tsx` (la configuration Tiptap est reprise telle quelle de `header.tsx`) :

```tsx
'use client';

import { type RouterOutputs, api } from '@/trpc/react';
import Highlight from '@tiptap/extension-highlight';
import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import TiptapUnderline from '@tiptap/extension-underline';
import { EditorContent, type Extension, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import BioToolbar from './bio-toolbar';
import { usePreview } from './preview-context';

const extensions = [
  StarterKit.configure({ link: false, underline: false }),
  Placeholder.configure({
    placeholder: 'Présentez-vous en quelques lignes…',
    showOnlyWhenEditable: true,
  }),
  TiptapLink.configure({ openOnClick: false }),
  TiptapUnderline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
] as Extension[];

const HTML_TAG_RE = /<[^>]*>/g;

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

export default function ProfileAbout({
  profileLink: initialData,
}: {
  profileLink: ProfileLinkData;
}) {
  const { link } = useParams<{ link: string }>();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link },
    { initialData, staleTime: 60_000 }
  );
  const { preview } = usePreview();
  const { mutate: updateProfileLink } = api.profileLink.update.useMutation();

  const [bio, setBio] = useState(initialData.bio ?? '');
  const lastSavedBio = useRef(initialData.bio ?? '');
  const isEditable = Boolean(profileLink?.canEdit) && !preview;

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialData.bio,
    editable: isEditable,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none text-foreground/80 focus:outline-none prose-p:my-1',
      },
    },
    onUpdate: ({ editor: current }) => setBio(current.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(isEditable);
  }, [editor, isEditable]);

  useEffect(() => {
    if (!isEditable || bio === lastSavedBio.current) {
      return;
    }
    const timer = setTimeout(() => {
      lastSavedBio.current = bio;
      updateProfileLink({ id: initialData.id, bio });
    }, 800);
    return () => clearTimeout(timer);
  }, [isEditable, bio, initialData.id, updateProfileLink]);

  if (!profileLink) {
    return null;
  }

  const hasBio = bio.replace(HTML_TAG_RE, '').trim().length > 0;
  if (!(hasBio || isEditable)) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        À propos
      </h2>
      <div className="group/bio relative">
        <EditorContent editor={editor} />
        {isEditable && editor && (
          <div className="invisible absolute left-0 z-40 mt-1 group-focus-within/bio:visible">
            <BioToolbar
              editor={editor}
              name={profileLink.name}
              links={profileLink.bento
                .filter((b) => b.type === 'link' && 'href' in b)
                .map((b) => (b as { href: string }).href)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write "src/app/[link]/_components/profile-about.tsx"` → aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[link]/_components/profile-about.tsx"
git commit -m "feat: about section with inline bio editing"
```

---

### Task 7: Barre du haut

**Files:**
- Create: `src/app/[link]/_components/profile-top-bar.tsx`

**Interfaces:**
- Consumes: `Wordmark` (`@/components/brand`), `LinkQRModal` (`@/components/modals/link-qr-modal`, prend `children`), `usePreview`.
- Produces: `<ProfileTopBar profileLink={ProfileLinkData} />`.

- [ ] **Step 1: Créer le composant**

```tsx
'use client';

import { Wordmark } from '@/components/brand';
import LinkQRModal from '@/components/modals/link-qr-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { SITE_URL } from '@/lib/site';
import type { RouterOutputs } from '@/trpc/react';
import {
  Eye,
  Flag,
  Monitor,
  MoreHorizontal,
  PenLine,
  QrCode,
  Share2,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { usePreview } from './preview-context';

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

export default function ProfileTopBar({
  profileLink,
}: {
  profileLink: ProfileLinkData;
}) {
  const { preview, setPreview, viewport, setViewport } = usePreview();
  const url = `${SITE_URL}/${profileLink.link}`;

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: profileLink.name, url }).catch(() => undefined);
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => toast({ title: 'Lien copié' }))
      .catch(() => undefined);
  };

  return (
    <header className="flex items-center justify-between gap-3">
      <Link href="/personalities" aria-label="Découvrir des personnalités">
        <Wordmark className="text-lg" />
      </Link>

      <div className="flex items-center gap-1.5">
        {profileLink.canEdit && (
          <>
            <Button
              size="icon"
              variant={preview ? 'default' : 'outline'}
              className="size-9 rounded-full"
              onClick={() => setPreview(!preview)}
              data-tour="preview-toggle"
              title={preview ? 'Revenir à l’édition' : 'Voir comme un visiteur'}
            >
              {preview ? (
                <PenLine className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
            <div
              className="hidden items-center rounded-full border border-border p-0.5 md:flex"
              data-tour="viewport-switcher"
            >
              <Button
                size="icon"
                variant={viewport === 'desktop' ? 'default' : 'ghost'}
                className="size-8 rounded-full"
                onClick={() => setViewport('desktop')}
                title="Aperçu ordinateur"
              >
                <Monitor className="size-4" />
              </Button>
              <Button
                size="icon"
                variant={viewport === 'mobile' ? 'default' : 'ghost'}
                className="size-8 rounded-full"
                onClick={() => setViewport('mobile')}
                title="Aperçu mobile"
              >
                <Smartphone className="size-4" />
              </Button>
            </div>
          </>
        )}

        <Button
          size="icon"
          variant="outline"
          className="size-9 rounded-full"
          onClick={share}
          title="Partager"
        >
          <Share2 className="size-4" />
        </Button>
        <LinkQRModal>
          <Button
            size="icon"
            variant="outline"
            className="size-9 rounded-full"
            title="QR code"
          >
            <QrCode className="size-4" />
          </Button>
        </LinkQRModal>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="size-9 rounded-full"
              title="Plus"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/report/${profileLink.link}`}>
                <Flag className="mr-2 size-4" />
                Signaler
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write "src/app/[link]/_components/profile-top-bar.tsx"` → aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[link]/_components/profile-top-bar.tsx"
git commit -m "feat: profile top bar with share, QR and report menu"
```

---

### Task 8: Réseaux officiels

**Files:**
- Create: `src/app/[link]/_components/edit-socials-dialog.tsx`
- Create: `src/app/[link]/_components/official-socials.tsx`

**Interfaces:**
- Consumes: `socialLinks` (Tâche 3), `api.profileLink.setSocialLinks` (Tâche 4), `PERSONALITY_PLATFORMS`, `PersonalityPlatform`, `platformLabel`.
- Produces: `<OfficialSocials profileLink={ProfileLinkData} />`.

- [ ] **Step 1: Modal d'édition**

Créer `src/app/[link]/_components/edit-socials-dialog.tsx` :

```tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  PERSONALITY_PLATFORMS,
  type PersonalityPlatform,
  platformLabel,
} from '@/lib/personality';
import { api } from '@/trpc/react';
import { Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { type ReactNode, useState } from 'react';

type Row = { key: number; platform: PersonalityPlatform; value: string };

function isPlatform(value: string): value is PersonalityPlatform {
  return (PERSONALITY_PLATFORMS as readonly string[]).includes(value);
}

export default function EditSocialsDialog({
  profileLinkId,
  socialLinks,
  children,
}: {
  profileLinkId: string;
  socialLinks: { platform: string; url: string }[];
  children: ReactNode;
}) {
  const { link } = useParams<{ link: string }>();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    socialLinks.map((item, index) => ({
      key: index,
      platform: isPlatform(item.platform) ? item.platform : 'website',
      value: item.url,
    }))
  );

  const { mutate, isPending } = api.profileLink.setSocialLinks.useMutation({
    onSuccess: async () => {
      await utils.profileLink.getByLink.invalidate({ link });
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Enregistrement impossible', description: error.message });
    },
  });

  const update = (key: number, patch: Partial<Omit<Row, 'key'>>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réseaux officiels</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutate({
              id: profileLinkId,
              links: rows
                .filter((row) => row.value.trim())
                .map(({ platform, value }) => ({ platform, value })),
            });
          }}
        >
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <select
                aria-label="Plateforme"
                value={row.platform}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isPlatform(value)) {
                    update(row.key, { platform: value });
                  }
                }}
                className="h-10 w-32 shrink-0 rounded-md border border-input bg-background px-2 text-sm"
              >
                {PERSONALITY_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platformLabel(platform)}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Identifiant ou lien"
                value={row.value}
                onChange={(event) =>
                  update(row.key, { value: event.target.value })
                }
                placeholder="@identifiant ou https://…"
                maxLength={200}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() =>
                  setRows((current) =>
                    current.filter((item) => item.key !== row.key)
                  )
                }
                title="Retirer"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {rows.length < 12 && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { key: Date.now(), platform: 'instagram', value: '' },
                ])
              }
            >
              <Plus className="mr-2 size-4" />
              Ajouter un réseau
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Rangée d'icônes**

Créer `src/app/[link]/_components/official-socials.tsx` :

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { platformLabel } from '@/lib/personality';
import { type RouterOutputs, api } from '@/trpc/react';
import { Pencil } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { IconType } from 'react-icons';
import { BsTwitterX } from 'react-icons/bs';
import {
  FaFacebook,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaTelegram,
  FaTiktok,
  FaYoutube,
} from 'react-icons/fa';
import EditSocialsDialog from './edit-socials-dialog';
import { usePreview } from './preview-context';

const ICONS: Record<string, IconType> = {
  instagram: FaInstagram,
  twitter: BsTwitterX,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  facebook: FaFacebook,
  github: FaGithub,
  linkedin: FaLinkedin,
  telegram: FaTelegram,
  website: FaGlobe,
};

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

export default function OfficialSocials({
  profileLink: initialData,
}: {
  profileLink: ProfileLinkData;
}) {
  const { link } = useParams<{ link: string }>();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link },
    { initialData, staleTime: 60_000 }
  );
  const { preview } = usePreview();

  if (!profileLink) {
    return null;
  }

  const isEditable = profileLink.canEdit && !preview;
  const { socialLinks } = profileLink;

  if (socialLinks.length === 0 && !isEditable) {
    return null;
  }

  return (
    <nav
      aria-label="Réseaux officiels"
      className="flex flex-wrap items-center justify-center gap-2 @4xl:justify-start"
    >
      {socialLinks.map((social) => {
        const Icon = ICONS[social.platform] ?? FaGlobe;
        return (
          <a
            key={social.id}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            title={platformLabel(social.platform)}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-background/80 text-foreground/80 shadow-sm transition-all hover:-translate-y-0.5 hover:text-foreground"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
      {isEditable && (
        <EditSocialsDialog
          key={socialLinks.map((social) => social.id).join()}
          profileLinkId={profileLink.id}
          socialLinks={socialLinks}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-10 rounded-xl border border-border border-dashed px-3 text-xs"
          >
            <Pencil className="mr-1 size-3.5" />
            {socialLinks.length ? 'Réseaux' : 'Ajouter vos réseaux officiels'}
          </Button>
        </EditSocialsDialog>
      )}
    </nav>
  );
}
```

La `key` sur le dialog réinitialise ses lignes quand la liste enregistrée change.

- [ ] **Step 3: Vérifier**

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write "src/app/[link]/_components/edit-socials-dialog.tsx" "src/app/[link]/_components/official-socials.tsx"` → aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[link]/_components/edit-socials-dialog.tsx" "src/app/[link]/_components/official-socials.tsx"
git commit -m "feat: official socials row with inline editor"
```

---

### Task 9: Communauté

**Files:**
- Create: `src/app/[link]/_components/community.tsx`

**Interfaces:**
- Consumes: `supporters` (Tâche 3), `firstNameOf`, `initialsOf`, `supportersSummary` (Tâche 1).
- Produces: `<Community name={string} supporters={{ count: number; recent: { displayName: string }[] }} />`.

- [ ] **Step 1: Créer le composant**

```tsx
import { firstNameOf, initialsOf, supportersSummary } from '@/lib/personality';

const AVATAR_COLORS = ['#F75FC0', '#B43CF0', '#5B6CFF', '#FDBA8C', '#3FD8FF'];

export default function Community({
  name,
  supporters,
}: {
  name: string;
  supporters: { count: number; recent: { displayName: string }[] };
}) {
  const names = supporters.recent.map((item) => item.displayName);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        Communauté
      </h2>
      <div className="flex items-center gap-3">
        {names.length > 0 && (
          <div className="-space-x-2 flex">
            {names.map((displayName, index) => (
              <span
                key={displayName}
                title={displayName}
                className="flex size-8 items-center justify-center rounded-full border-2 border-background font-bold font-brand text-[11px] text-white"
                style={{
                  backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                }}
              >
                {initialsOf(displayName)}
              </span>
            ))}
          </div>
        )}
        <p className="text-foreground/80 text-sm">
          {supportersSummary({
            names,
            count: supporters.count,
            firstName: firstNameOf(name),
          })}
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write "src/app/[link]/_components/community.tsx"` → aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[link]/_components/community.tsx"
git commit -m "feat: community section with public supporters"
```

---

### Task 10: Espace de blocs

**Files:**
- Create: `src/app/[link]/_components/profile-space.tsx`
- Modify: `src/app/[link]/_components/action-bar.tsx:103-104`

**Interfaces:**
- Consumes: `Bento` (`./bento`, prop `profileLink`), classe `aura-space` (Tâche 1), `firstNameOf`.
- Produces: `<ProfileSpace profileLink={ProfileLinkData} />`.

- [ ] **Step 1: Créer la section**

```tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { firstNameOf } from '@/lib/personality';
import { type RouterOutputs, api } from '@/trpc/react';
import { LayoutGrid } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import Bento from './bento';
import { usePreview } from './preview-context';

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

export default function ProfileSpace({
  profileLink: initialData,
}: {
  profileLink: ProfileLinkData;
}) {
  const { link } = useParams<{ link: string }>();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link },
    { initialData, staleTime: 60_000 }
  );
  const { preview } = usePreview();

  if (!profileLink) {
    return null;
  }

  const isEditable = profileLink.canEdit && !preview;
  const isEmpty = profileLink.bento.length === 0;

  if (isEmpty && !isEditable) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        Espace de {firstNameOf(profileLink.name)}
      </h2>
      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-border border-dashed px-6 py-10 text-center text-muted-foreground text-sm">
          <LayoutGrid className="size-5" />
          Ajoutez votre premier bloc : vidéo, musique, compte à rebours…
          <span className="text-xs">Utilisez le bouton + de la barre d’outils.</span>
        </div>
      ) : (
        <div className="aura-space">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-6 @4xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-[1.25rem]" />
                ))}
              </div>
            }
          >
            <Bento profileLink={profileLink} />
          </Suspense>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Style de la barre d'outils**

Dans `src/app/[link]/_components/action-bar.tsx`, remplacer la classe du conteneur interne de la barre :

```tsx
        <div className="mx-auto flex w-max items-center gap-x-2 rounded-xl border border-border/50 bg-background/90 px-2 py-2 shadow-lg backdrop-blur-sm">
```

par :

```tsx
        <div className="mx-auto flex w-max items-center gap-x-2 rounded-full border border-border/60 bg-background/90 px-3 py-2 shadow-[0_10px_40px_-12px_rgba(180,60,240,0.45)] backdrop-blur-md">
```

- [ ] **Step 3: Vérifier**

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write "src/app/[link]/_components/profile-space.tsx" "src/app/[link]/_components/action-bar.tsx"` → aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[link]/_components/profile-space.tsx" "src/app/[link]/_components/action-bar.tsx"
git commit -m "feat: profile space section and aura toolbar style"
```

---

### Task 11: Bouton Soutenir, pied de page et assemblage

**Files:**
- Create: `src/app/[link]/_components/support-button.tsx`
- Create: `src/app/[link]/_components/profile-footer.tsx`
- Modify: `src/app/[link]/page.tsx`
- Modify: `src/app/[link]/layout.tsx`
- Modify: `src/app/[link]/loading.tsx`
- Modify: `src/app/[link]/_components/viewport-container.tsx`
- Delete: `src/app/[link]/_components/header.tsx`, `src/app/[link]/_components/profile-public-meta.tsx`

**Interfaces:**
- Consumes: tous les composants des Tâches 5 à 10.
- Produces: la page finale.

- [ ] **Step 1: Bouton Soutenir**

Créer `src/app/[link]/_components/support-button.tsx` :

```tsx
'use client';

import { firstNameOf } from '@/lib/personality';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { usePreview } from './preview-context';

export default function SupportButton({
  slug,
  name,
  canEdit,
  variant,
}: {
  slug: string;
  name: string;
  canEdit: boolean;
  variant: 'sticky' | 'inline';
}) {
  const { preview } = usePreview();

  // Editors get the action bar in that spot; they see the button in preview.
  if (canEdit && !preview && variant === 'sticky') {
    return null;
  }

  const button = (
    <Link
      href={`/support/${slug}`}
      className="aura-cta flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-brand font-semibold text-base shadow-[0_10px_30px_-10px_rgba(180,60,240,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <Heart className="size-4 fill-current" />
      Soutenir {firstNameOf(name)}
    </Link>
  );

  if (variant === 'inline') {
    return <div className="hidden @4xl:block">{button}</div>;
  }

  return (
    <div className="sticky bottom-0 z-40 mt-6 bg-gradient-to-t from-35% from-background to-transparent px-1 pt-6 pb-4 @4xl:hidden">
      {button}
    </div>
  );
}
```

Le bouton collé utilise `sticky` (et non `fixed`) pour rester dans le conteneur, ce qui garde l'aperçu mobile du propriétaire correct.

- [ ] **Step 2: Pied de page**

Créer `src/app/[link]/_components/profile-footer.tsx` :

```tsx
import { SITE_NAME } from '@/lib/site';
import Link from 'next/link';

export default function ProfileFooter({
  customFooter,
}: {
  customFooter: string | null;
}) {
  return (
    <footer className="py-10 text-center">
      {customFooter ? (
        <p className="text-muted-foreground text-xs">{customFooter}</p>
      ) : (
        <Link
          href="/personalities"
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          Découvrir d’autres personnalités sur{' '}
          <span className="font-bold font-brand text-foreground">
            {SITE_NAME}
          </span>
        </Link>
      )}
    </footer>
  );
}
```

- [ ] **Step 3: Page**

Dans `src/app/[link]/page.tsx` :

1. Remplacer les imports de composants locaux et devenus inutiles. Supprimer `import { Skeleton } ...`, `import { ArrowRight } ...`, `import Link from 'next/link';`, `import Bento from './_components/bento';`, `import ProfileLinkHeader from './_components/header';`, `import ProfilePublicMeta from './_components/profile-public-meta';`, et `Suspense` n'est plus importé que s'il est utilisé (il l'est, garder `import { Suspense, cache } from 'react';`). Ajouter :

```tsx
import type { CSSProperties } from 'react';
import Community from './_components/community';
import OfficialSocials from './_components/official-socials';
import ProfileAbout from './_components/profile-about';
import ProfileFooter from './_components/profile-footer';
import ProfileHero from './_components/profile-hero';
import ProfileSpace from './_components/profile-space';
import ProfileTopBar from './_components/profile-top-bar';
import SupportButton from './_components/support-button';
```

2. Remplacer `if (profileLink.status === 'suspended' && !profileLink.canEdit)` — inchangé depuis la Tâche 2, rien à faire.

3. Dans `jsonLd.mainEntity.sameAs`, utiliser les réseaux officiels en plus des liens :

```tsx
      sameAs: [
        ...profileLink.socialLinks.map((social) => social.url),
        ...profileLink.bento
          .filter((b) => b.type === 'link' && b.href)
          .map((b) => (b as { href: string }).href),
      ],
```

4. Remplacer tout le `return (...)` du composant `Page` par :

```tsx
  const accentStyle = profileLink.accentColor
    ? ({ '--aura-accent': profileLink.accentColor } as CSSProperties)
    : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD with server-only data from our DB
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ThemeWrapper
        theme={profileLink.theme}
        darkMode={profileLink.darkMode}
        accentColor={profileLink.accentColor}
      >
        <PreviewProvider>
          <Suspense>
            <BentoHistoryProvider>
              <ViewportContainer>
                <div className="@container animate-fade-in" style={accentStyle}>
                  <ProfileTopBar profileLink={profileLink} />

                  <div className="mt-8 grid gap-8 @4xl:grid-cols-[340px_minmax(0,1fr)] @4xl:gap-12">
                    <aside className="flex flex-col gap-5 @4xl:sticky @4xl:top-8 @4xl:self-start">
                      <ProfileHero profileLink={profileLink} />
                      <OfficialSocials profileLink={profileLink} />
                      <SupportButton
                        slug={profileLink.link}
                        name={profileLink.name}
                        canEdit={profileLink.canEdit}
                        variant="inline"
                      />
                    </aside>

                    <main className="flex min-w-0 flex-col gap-8">
                      <Community
                        name={profileLink.name}
                        supporters={profileLink.supporters}
                      />
                      <ProfileAbout profileLink={profileLink} />
                      <ProfileSpace profileLink={profileLink} />
                    </main>
                  </div>

                  <ProfileFooter customFooter={profileLink.customFooter} />

                  <SupportButton
                    slug={profileLink.link}
                    name={profileLink.name}
                    canEdit={profileLink.canEdit}
                    variant="sticky"
                  />
                </div>

                {profileLink.canEdit && (
                  <>
                    <ActionBar />
                    <OnboardingTour />
                  </>
                )}
              </ViewportContainer>
            </BentoHistoryProvider>
          </Suspense>
        </PreviewProvider>
      </ThemeWrapper>
    </>
  );
```

- [ ] **Step 4: Conteneur, layout et squelette**

Dans `src/app/[link]/_components/viewport-container.tsx`, dans le dernier `return`, remplacer `isMobile ? 'max-w-sm' : 'max-w-3xl'` par `isMobile ? 'max-w-sm' : 'max-w-6xl'`.

Remplacer tout `src/app/[link]/layout.tsx` par :

```tsx
import type React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full flex-col items-center px-4 pt-5 pb-8 md:px-8">
      {children}
    </div>
  );
}
```

Remplacer tout `src/app/[link]/loading.tsx` par :

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Page() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 pt-16">
      <Skeleton className="size-28 rounded-full" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-32 rounded-full" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="size-10 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-24 w-full rounded-[1.25rem]" />
    </div>
  );
}
```

- [ ] **Step 5: Supprimer les anciens composants**

```bash
git rm "src/app/[link]/_components/header.tsx" "src/app/[link]/_components/profile-public-meta.tsx"
```

Run: `grep -rn "_components/header\|profile-public-meta\|ProfileLinkHeader" src`
Expected: aucune ligne.

- [ ] **Step 6: Vérifier**

Run: `bun run typecheck` → aucune erreur.
Run: `bunx biome check --write "src/app/[link]"` → aucune erreur (l'avertissement de complexité existant dans `action-bar.tsx` est hors périmètre).

Navigateur : `http://localhost:3000/<slug>` affiche la nouvelle fiche.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[link]"
git commit -m "feat: assemble the AuraSpot personality profile page"
```

---

### Task 12: Vérification dans le navigateur

**Files:** aucun, sauf correctifs découverts (chacun dans le fichier concerné, puis commit `fix:`).

Préparer les données locales avec l'admin (`/admin`) et le parcours de soutien sandbox (`/support/<slug>`) :
- fiche **A** : vérifiée, avec photo, catégorie, lieu, 2 réseaux, une bio, 3 blocs (vidéo, compte à rebours, lien), 3 soutiens publics dont 2 avec le même nom, 1 anonyme ;
- fiche **B** : non revendiquée, sans photo, sans rien d'autre ;
- un second compte ajouté comme gestionnaire de la fiche A (revendication approuvée dans `/admin/claims`).

- [ ] **Step 1: Visiteur, mobile (375 px)**, fiche A en navigation privée : une colonne ; anneau, nom, badge, pastilles, « 4 soutiens » ; icônes des réseaux ; Communauté avec 2 avatars (le nom en double n'apparaît qu'une fois) et « Aïcha, Grâce et 2 autres » ; À propos ; Espace avec les 3 blocs restylés ; bouton « Soutenir … » collé en bas ; menu ⋯ → Signaler mène à `/report/<slug>` ; aucun bouton d'édition ; la réponse `getByLink` n'a ni `monthlyViews` ni montant.
- [ ] **Step 2: Visiteur, ordinateur (1440 px)**, fiche A : deux colonnes, colonne gauche fixe au défilement avec le bouton Soutenir intégré, pas de bouton collé en bas ; grille des blocs en 4 colonnes.
- [ ] **Step 3: Fiche B** : initiales dans l'anneau, « Fiche non revendiquée · C’est vous ? Revendiquer », « Soyez le premier à soutenir … », pas de sections Réseaux, À propos, Espace ; pied de page vers `/personalities`.
- [ ] **Step 4: Propriétaire**, fiche A : barre d'outils en bas, pas de bouton Soutenir collé ; modifier le nom (sauvé après 0,8 s, visible au rechargement) ; modifier la bio ; changer catégorie et lieu ; ajouter puis retirer un réseau (un identifiant invalide affiche l'erreur) ; changer la photo ; ligne « … visites ce mois · Voir les statistiques » ; bascule « Voir comme un visiteur » ; aperçu mobile en une colonne.
- [ ] **Step 5: Gestionnaire** (second compte) sur la fiche A : mêmes droits qu'à l'étape 4 ; la suppression de la fiche depuis `/app` reste refusée.
- [ ] **Step 6: Thème sombre et accent** : activer le mode sombre et une couleur d'accent dans les réglages de thème ; halo, anneau et bouton Soutenir suivent l'accent ; textes lisibles.
- [ ] **Step 7: Nom long** : renommer la fiche B en « Orchestre Symphonique des Jeunes de Pointe-Noire » ; le nom passe à la ligne sans déborder à 375 px ; le bouton affiche « Soutenir Orchestre ».
- [ ] **Step 8: Finaliser**

Run: `bun run typecheck` et `bun run lint`
Expected: aucune nouvelle erreur par rapport à `main` avant la Tâche 1.

```bash
git push
```
