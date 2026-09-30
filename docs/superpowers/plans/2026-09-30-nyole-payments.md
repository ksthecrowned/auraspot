# Paiements Nyole — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter Nyole (page de paiement hébergée : carte + Mobile Money) comme troisième choix sur la page de paiement d'un don, à côté de MTN MoMo et Airtel Money en direct.

**Architecture:** Un paiement naît avec `provider = 'sandbox'`. Choisir Nyole le réserve (`provider = 'nyole'`), crée une session Nyole (clé d'idempotence = id du paiement) et redirige. Le statut est toujours relu côté serveur (`syncPayment`), déclenché par le polling de la page, le webhook signé Nyole ou le nettoyage des paiements périmés ; il passe par `applyPaymentEvent` et le ledger existants.

**Tech Stack:** Next.js 16 App Router, tRPC 11, Drizzle (PostgreSQL), Bun (`bun test`), Biome.

**Spec:** `docs/superpowers/specs/2026-09-30-nyole-payments-design.md`

## Global Constraints

- Aucune migration SQL : `payment.provider` est un texte et reçoit `'nyole'`.
- AuraSpot absorbe les 5 % Nyole : aucune écriture de frais dans le ledger.
- Montants en entiers, devise `XAF` (`SUPPORT_CURRENCY`).
- L'arrivée sur `success_url` ne crédite jamais rien : seul le statut relu par l'API Nyole fait foi.
- Textes visibles en français, avec accents et apostrophes typographiques (`’`) comme le reste du code.
- `bun` pour toutes les commandes ; Biome doit passer (`bunx biome check --write <fichiers>`), le hook pre-commit le relance.
- API Nyole : base `https://app.nyole.com` (surchargée par `NYOLE_BASE_URL`), `POST /api/v1/checkout/sessions`, `GET /api/v1/checkout/sessions/{id}/status`, page `/checkout/{id}`, simulation `POST /api/checkout/sandbox` `{ transactionId, issue: "succes" | "echec" }`.
- Webhook : en-tête `X-Afriflow-Signature: t=<ts>,v1=<hex>`, `v1 = HMAC-SHA256(NYOLE_SECRET_KEY, "<ts>.<corps brut>")`, tolérance 5 minutes.
- `.env` contient une clé **test** (`af_test_sec_...`). Ne jamais afficher la clé.
- La tâche 7 écrit des dons de test dans la base `DATABASE_URL` : demander l'accord de l'utilisateur avant.

## Review Focus

1. **Double clic sur « Continuer vers Nyole »** : une seule session, les deux clics redirigent vers la même URL (réservation atomique + `Idempotency-Key`) — vérifié en tâche 7, étape 5.
2. **API Nyole indisponible à la création** : le paiement passe `failed`, message clair, pas de paiement bloqué en « réservé » — test manuel tâche 7, étape 8.
3. **Webhook sans signature, signature fausse, horodatage périmé ou corps modifié** : 401, aucune écriture — tests unitaires tâche 1 + curl tâche 7.
4. **Webhook au JSON invalide ou pour un paiement inconnu** : 200, pas d'exception — tests unitaires tâche 1 (`nyoleWebhookTarget`) + curl tâche 7.
5. **Paiement Nyole réglé après expiration (3 jours)** : crédité au ledger, don mensuel inchangé ; refusé pour MoMo — tests unitaires tâche 2.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/server/payments/nyole.ts` (nouveau) | Client API Nyole, signature webhook, conversion des statuts. Aucune dépendance à la base. |
| `src/server/payments/nyole.test.ts` (nouveau) | Tests unitaires du précédent. |
| `src/server/payments/transitions.ts` (nouveau) | Règle `canTransition` des statuts de paiement (sortie de `support.ts` pour être testable sans base). |
| `src/server/payments/transitions.test.ts` (nouveau) | Tests de la règle. |
| `src/server/db/utils/support.ts` | `applyPaymentEvent` (paiement tardif), `syncPayment` (remplace `syncMobileMoneyPayment`), `startNyolePayment`, `getCheckout.resumeUrl`. |
| `src/server/db/utils/recurring.ts` | Utilise `syncPayment`. |
| `src/app/api/webhook/{momo,airtel}/route.ts` | Utilisent `syncPayment`. |
| `src/app/api/webhook/nyole/route.ts` (nouveau) | Webhook signé Nyole. |
| `src/server/api/routers/support.ts` | Mutation `payWithNyole`, `syncCheckout` via `syncPayment`. |
| `src/hooks/use-payment-polling.ts` (nouveau) | Polling du statut partagé par les composants de paiement. |
| `src/components/forms/mobile-money-checkout.tsx` | Carte « Carte ou Mobile Money » (Nyole). |
| `src/components/forms/nyole-pending.tsx` (nouveau) | État « Reprendre sur Nyole / Faire un nouveau don ». |
| `src/app/support/checkout/[paymentId]/page.tsx` | Affiche Nyole et l'état en attente. |
| `src/env.mjs`, `.env.example`, `package.json` | Variables `NYOLE_*`, script `test`, `@types/bun`. |

---

### Task 1: Client Nyole et vérification de signature

**Files:**
- Create: `src/server/payments/nyole.ts`
- Create: `src/server/payments/nyole.test.ts`
- Modify: `src/env.mjs` (blocs `server` et `runtimeEnv`)
- Modify: `.env.example`
- Modify: `package.json` (script `test`, devDependency `@types/bun`)

**Interfaces:**
- Consumes: `env` (`@/env.mjs`), type `paymentStatuses` (`@/server/db/schema/support`).
- Produces:
  - `NYOLE_PROVIDER: 'nyole'`
  - `NYOLE_PENDING_PREFIX: 'nyole_pending_'`
  - `class NyoleError extends Error`
  - `nyoleEnabled(): boolean`
  - `nyoleCheckoutUrl(sessionId: string): string`
  - `createNyoleSession(input: { paymentId: string; amount: number; currency: string; returnUrl: string }): Promise<{ id: string; url: string }>`
  - `getNyoleSessionStatus(sessionId: string): Promise<PaymentStatus>`
  - `toPaymentStatus(status: string | undefined): PaymentStatus`
  - `verifyNyoleSignature(input: { secret: string; rawBody: string; header: string | null; nowSeconds: number }): boolean`
  - `nyoleWebhookTarget(rawBody: string): { paymentId: string } | { providerReference: string } | null`
  - `type PaymentStatus` = `(typeof paymentStatuses)[number]`

- [ ] **Step 1: Outillage de test**

```bash
bun add -d @types/bun
```

Dans `package.json`, bloc `scripts`, ajouter après `"typecheck"` :

```json
    "test": "SKIP_ENV_VALIDATION=1 bun test src",
```

- [ ] **Step 2: Variables d'environnement**

Dans `src/env.mjs`, bloc `server`, juste après `PAYMENTS_WEBHOOK_SECRET: z.string().min(16).optional(),` :

```js
    // Nyole hosted checkout (card + mobile money). Secret key af_(test|live)_sec_…
    NYOLE_SECRET_KEY: z.string().min(1).optional(),
    NYOLE_BASE_URL: z.string().url().optional(),
```

Bloc `runtimeEnv`, juste après `PAYMENTS_WEBHOOK_SECRET: process.env.PAYMENTS_WEBHOOK_SECRET || undefined,` :

```js
    NYOLE_SECRET_KEY: process.env.NYOLE_SECRET_KEY || undefined,
    NYOLE_BASE_URL: process.env.NYOLE_BASE_URL || undefined,
```

Dans `.env.example`, après la ligne `PAYMENTS_WEBHOOK_SECRET=` :

```bash
# Nyole (https://nyole.com): hosted checkout, card + mobile money.
# Test key af_test_sec_… in development, live key in production.
NYOLE_SECRET_KEY=
# NYOLE_BASE_URL=https://app.nyole.com
```

- [ ] **Step 3: Écrire les tests (échouent)**

`src/server/payments/nyole.test.ts` :

```ts
import { describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import {
  nyoleWebhookTarget,
  toPaymentStatus,
  verifyNyoleSignature,
} from './nyole';

const SECRET = 'af_test_sec_unit';
const BODY = '{"type":"payment.completed","data":{"id":"cs_1"}}';
const NOW = 1_790_000_000;

function sign(timestamp: number, body: string, secret = SECRET) {
  const v1 = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return `t=${timestamp},v1=${v1}`;
}

describe('verifyNyoleSignature', () => {
  test('accepts a valid signature', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY,
        header: sign(NOW, BODY),
        nowSeconds: NOW + 10,
      })
    ).toBe(true);
  });

  test('rejects a missing header', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY,
        header: null,
        nowSeconds: NOW,
      })
    ).toBe(false);
  });

  test('rejects another secret', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY,
        header: sign(NOW, BODY, 'af_test_sec_other'),
        nowSeconds: NOW,
      })
    ).toBe(false);
  });

  test('rejects a modified body', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY.replace('cs_1', 'cs_2'),
        header: sign(NOW, BODY),
        nowSeconds: NOW,
      })
    ).toBe(false);
  });

  test('rejects a timestamp older than 5 minutes', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY,
        header: sign(NOW, BODY),
        nowSeconds: NOW + 5 * 60 + 1,
      })
    ).toBe(false);
  });

  test('rejects a malformed header', () => {
    for (const header of ['', 't=,v1=', 'v1=abcd', `t=${NOW}`, 'garbage']) {
      expect(
        verifyNyoleSignature({
          secret: SECRET,
          rawBody: BODY,
          header,
          nowSeconds: NOW,
        })
      ).toBe(false);
    }
  });
});

describe('toPaymentStatus', () => {
  test('maps Nyole statuses', () => {
    expect(toPaymentStatus('PENDING')).toBe('pending');
    expect(toPaymentStatus('SUCCESS')).toBe('success');
    expect(toPaymentStatus('FAILED')).toBe('failed');
    expect(toPaymentStatus('CANCELLED')).toBe('cancelled');
    expect(toPaymentStatus('REFUNDED')).toBe('refunded');
    expect(toPaymentStatus('success')).toBe('success');
  });

  test('treats unknown or missing statuses as pending', () => {
    expect(toPaymentStatus('WHATEVER')).toBe('pending');
    expect(toPaymentStatus(undefined)).toBe('pending');
  });
});

describe('nyoleWebhookTarget', () => {
  const paymentId = '6f1c2b8e-4a53-4c1e-9a0b-2f3d4e5f6a7b';

  test('prefers the payment id from metadata', () => {
    expect(
      nyoleWebhookTarget(
        JSON.stringify({
          type: 'payment.completed',
          data: { id: 'cs_1', metadata: { payment_id: paymentId } },
        })
      )
    ).toEqual({ paymentId });
  });

  test('falls back to the session id', () => {
    expect(nyoleWebhookTarget(BODY)).toEqual({ providerReference: 'cs_1' });
  });

  test('ignores a payment id that is not a uuid', () => {
    expect(
      nyoleWebhookTarget(
        JSON.stringify({ data: { metadata: { payment_id: "1' OR 1=1" } } })
      )
    ).toBeNull();
  });

  test('returns null on invalid JSON or empty payload', () => {
    expect(nyoleWebhookTarget('not json')).toBeNull();
    expect(nyoleWebhookTarget('null')).toBeNull();
    expect(nyoleWebhookTarget('{}')).toBeNull();
  });
});
```

- [ ] **Step 4: Vérifier qu'ils échouent**

Run: `bun run test`
Expected: FAIL, « Cannot find module './nyole' ».

- [ ] **Step 5: Implémentation**

`src/server/payments/nyole.ts` :

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/env.mjs';
import type { paymentStatuses } from '@/server/db/schema/support';

// Nyole hosted checkout (https://nyole.com/docs): we create a session, the
// payer pays on Nyole's page (card, MTN MoMo, Airtel Money), and we read the
// final status from the API. Webhooks only tell us which payment to re-check.

export type PaymentStatus = (typeof paymentStatuses)[number];

export const NYOLE_PROVIDER = 'nyole';
// providerReference while the session is being created (see startNyolePayment).
export const NYOLE_PENDING_PREFIX = 'nyole_pending_';

const DEFAULT_BASE_URL = 'https://app.nyole.com';
const TRAILING_SLASH_RE = /\/$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;
const SIGNATURE_TOLERANCE_S = 5 * 60;

export class NyoleError extends Error {}

export function nyoleEnabled() {
  return Boolean(env.NYOLE_SECRET_KEY);
}

function baseUrl() {
  return (env.NYOLE_BASE_URL ?? DEFAULT_BASE_URL).replace(
    TRAILING_SLASH_RE,
    ''
  );
}

function secretKey() {
  const key = env.NYOLE_SECRET_KEY;
  if (!key) {
    throw new NyoleError('Nyole n’est pas configuré');
  }
  return key;
}

export function nyoleCheckoutUrl(sessionId: string) {
  return `${baseUrl()}/checkout/${encodeURIComponent(sessionId)}`;
}

// Idempotency-Key = our payment id: a retry returns the same session.
export async function createNyoleSession(input: {
  paymentId: string;
  amount: number;
  currency: string;
  returnUrl: string;
}) {
  const res = await fetch(`${baseUrl()}/api/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.paymentId,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      description: 'Don AuraSpot',
      merchant_name: 'AuraSpot',
      success_url: input.returnUrl,
      cancel_url: input.returnUrl,
      metadata: { payment_id: input.paymentId },
    }),
  });
  if (!res.ok) {
    throw new NyoleError(`Nyole a refusé la demande (${res.status})`);
  }
  const data = (await res.json()) as { id?: unknown; url?: unknown };
  if (typeof data.id !== 'string' || !data.id) {
    throw new NyoleError('Réponse Nyole invalide');
  }
  return {
    id: data.id,
    url: typeof data.url === 'string' ? data.url : nyoleCheckoutUrl(data.id),
  };
}

const STATUS_MAP: Record<string, PaymentStatus> = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

// Unknown statuses stay pending: nothing is credited on a guess.
export function toPaymentStatus(status: string | undefined): PaymentStatus {
  return STATUS_MAP[(status ?? '').toUpperCase()] ?? 'pending';
}

export async function getNyoleSessionStatus(
  sessionId: string
): Promise<PaymentStatus> {
  const res = await fetch(
    `${baseUrl()}/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}/status`,
    { headers: { Authorization: `Bearer ${secretKey()}` } }
  );
  if (!res.ok) {
    throw new NyoleError(`Statut Nyole indisponible (${res.status})`);
  }
  const data = (await res.json()) as { status?: string };
  return toPaymentStatus(data.status);
}

// X-Afriflow-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">
export function verifyNyoleSignature(input: {
  secret: string;
  rawBody: string;
  header: string | null;
  nowSeconds: number;
}) {
  if (!input.header) {
    return false;
  }
  const parts = new Map<string, string>();
  for (const part of input.header.split(',')) {
    const index = part.indexOf('=');
    if (index > 0) {
      parts.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
    }
  }
  const timestamp = parts.get('t');
  const signature = parts.get('v1');
  if (!(timestamp && signature)) {
    return false;
  }
  const seconds = Number(timestamp);
  if (
    !Number.isInteger(seconds) ||
    Math.abs(input.nowSeconds - seconds) > SIGNATURE_TOLERANCE_S
  ) {
    return false;
  }
  const expected = createHmac('sha256', input.secret)
    .update(`${timestamp}.${input.rawBody}`)
    .digest();
  const provided = Buffer.from(signature, 'hex');
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

// Which payment a webhook is about. The payload is only a hint: the status
// is always read back from the API.
export function nyoleWebhookTarget(
  rawBody: string
): { paymentId: string } | { providerReference: string } | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const data = (
    body as { data?: { id?: unknown; metadata?: { payment_id?: unknown } } }
  )?.data;
  const paymentId = data?.metadata?.payment_id;
  if (typeof paymentId === 'string' && UUID_RE.test(paymentId)) {
    return { paymentId };
  }
  if (typeof data?.id === 'string' && data.id) {
    return { providerReference: data.id };
  }
  return null;
}
```

- [ ] **Step 6: Vérifier qu'ils passent**

Run: `bun run test`
Expected: PASS, 12 tests.

Run: `bunx biome check --write src/server/payments/nyole.ts src/server/payments/nyole.test.ts src/env.mjs && bun run typecheck`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock src/env.mjs .env.example src/server/payments/nyole.ts src/server/payments/nyole.test.ts
git commit -m "feat(payments): Nyole API client and webhook signature"
```

---

### Task 2: Règle des transitions et paiement tardif

**Files:**
- Create: `src/server/payments/transitions.ts`
- Create: `src/server/payments/transitions.test.ts`
- Modify: `src/server/db/utils/support.ts` (constantes en tête de fichier, `applyPaymentEvent`)

**Interfaces:**
- Consumes: `NYOLE_PROVIDER`, `PaymentStatus` (tâche 1).
- Produces: `canTransition(provider: string, from: PaymentStatus, to: PaymentStatus): boolean`.

- [ ] **Step 1: Écrire les tests (échouent)**

`src/server/payments/transitions.test.ts` :

```ts
import { describe, expect, test } from 'bun:test';
import { canTransition } from './transitions';

describe('canTransition', () => {
  test('keeps the usual rules for every provider', () => {
    for (const provider of ['mtn_momo', 'airtel_money', 'nyole', 'sandbox']) {
      expect(canTransition(provider, 'pending', 'success')).toBe(true);
      expect(canTransition(provider, 'pending', 'failed')).toBe(true);
      expect(canTransition(provider, 'pending', 'cancelled')).toBe(true);
      expect(canTransition(provider, 'success', 'refunded')).toBe(true);
      expect(canTransition(provider, 'failed', 'success')).toBe(false);
      expect(canTransition(provider, 'success', 'pending')).toBe(false);
      expect(canTransition(provider, 'refunded', 'success')).toBe(false);
    }
  });

  test('credits a Nyole payment paid after we expired it', () => {
    expect(canTransition('nyole', 'cancelled', 'success')).toBe(true);
  });

  test('never revives an expired mobile money payment', () => {
    expect(canTransition('mtn_momo', 'cancelled', 'success')).toBe(false);
    expect(canTransition('airtel_money', 'cancelled', 'success')).toBe(false);
  });

  test('a cancelled Nyole payment cannot fail or be cancelled again', () => {
    expect(canTransition('nyole', 'cancelled', 'failed')).toBe(false);
    expect(canTransition('nyole', 'cancelled', 'refunded')).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `bun run test`
Expected: FAIL, « Cannot find module './transitions' ».

- [ ] **Step 3: Implémentation**

`src/server/payments/transitions.ts` :

```ts
import { NYOLE_PROVIDER, type PaymentStatus } from './nyole';

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['success', 'failed', 'cancelled'],
  success: ['refunded'],
  failed: [],
  cancelled: [],
  refunded: [],
};

// A Nyole session cannot be cancelled through the API: after we expire a
// stale payment the payer can still pay it. That money is real, so it is
// credited. Mobile money requests expire at the operator, so they cannot.
export function canTransition(
  provider: string,
  from: PaymentStatus,
  to: PaymentStatus
) {
  if (PAYMENT_TRANSITIONS[from].includes(to)) {
    return true;
  }
  return provider === NYOLE_PROVIDER && from === 'cancelled' && to === 'success';
}
```

- [ ] **Step 4: Brancher dans `support.ts`**

En tête de `src/server/db/utils/support.ts`, supprimer :

```ts
import type { paymentStatuses } from '../schema/support';
```

et le bloc :

```ts
type PaymentStatus = (typeof paymentStatuses)[number];

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['success', 'failed', 'cancelled'],
  success: ['refunded'],
  failed: [],
  cancelled: [],
  refunded: [],
};
```

Ajouter aux imports :

```ts
import type { PaymentStatus } from '@/server/payments/nyole';
import { canTransition } from '@/server/payments/transitions';
```

Dans `applyPaymentEvent`, remplacer :

```ts
  if (!PAYMENT_TRANSITIONS[row.status].includes(input.status)) {
    return { error: 'invalid-transition' as const };
  }
```

par :

```ts
  if (!canTransition(row.provider, row.status, input.status)) {
    return { error: 'invalid-transition' as const };
  }
  // Paid after we expired it (Nyole): credit it, leave the plan alone.
  const latePayment = row.status === 'cancelled';
```

et remplacer :

```ts
  const planId = row.support.recurringSupportId;
```

par :

```ts
  const planId = latePayment ? null : row.support.recurringSupportId;
```

- [ ] **Step 5: Vérifier**

Run: `bun run test`
Expected: PASS (tests des tâches 1 et 2).

Run: `bunx biome check --write src/server/payments/transitions.ts src/server/payments/transitions.test.ts src/server/db/utils/support.ts && bun run typecheck`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/server/payments/transitions.ts src/server/payments/transitions.test.ts src/server/db/utils/support.ts
git commit -m "feat(payments): credit Nyole payments paid after expiry"
```

---

### Task 3: `syncPayment` pour tous les prestataires

**Files:**
- Modify: `src/server/db/utils/support.ts` (`syncMobileMoneyPayment` → `syncPayment`)
- Modify: `src/server/db/utils/recurring.ts` (`closeStalePendingPayments`, imports)
- Modify: `src/server/api/routers/support.ts` (import, `syncCheckout`)
- Modify: `src/app/api/webhook/momo/route.ts`, `src/app/api/webhook/airtel/route.ts`

**Interfaces:**
- Consumes: `getNyoleSessionStatus`, `NYOLE_PROVIDER`, `NYOLE_PENDING_PREFIX` (tâche 1).
- Produces: `syncPayment(where: { paymentId: string } | { providerReference: string }): Promise<PaymentStatus | null>` — `null` si paiement inconnu. `syncMobileMoneyPayment` n'existe plus.

- [ ] **Step 1: Remplacer la fonction dans `support.ts`**

Ajouter à l'import de `@/server/payments/nyole` (créé en tâche 2) :

```ts
import {
  NYOLE_PENDING_PREFIX,
  NYOLE_PROVIDER,
  type PaymentStatus,
  getNyoleSessionStatus,
} from '@/server/payments/nyole';
```

Remplacer toute la fonction `syncMobileMoneyPayment` (commentaire compris) par :

```ts
// Reads the status from the provider and applies it. Used by the checkout
// page (polling), provider webhooks (whose payload is never trusted) and the
// stale-payment cleanup.
export const syncPayment = async (
  where: { paymentId: string } | { providerReference: string }
): Promise<PaymentStatus | null> => {
  const row = await db.query.payment.findFirst({
    where: (table, { eq: equals }) =>
      'paymentId' in where
        ? equals(table.id, where.paymentId)
        : equals(table.providerReference, where.providerReference),
    columns: { provider: true, providerReference: true, status: true },
  });
  if (!row) {
    return null;
  }
  const nyole = row.provider === NYOLE_PROVIDER;
  // An expired Nyole payment can still be paid late (see canTransition).
  const open =
    row.status === 'pending' || (nyole && row.status === 'cancelled');
  if (!open) {
    return row.status;
  }

  let status: PaymentStatus;
  if (nyole) {
    // Session not created yet: nothing to ask Nyole.
    if (row.providerReference.startsWith(NYOLE_PENDING_PREFIX)) {
      return row.status;
    }
    status = await getNyoleSessionStatus(row.providerReference);
  } else if (isMobileMoneyOperator(row.provider)) {
    status = await getProviderStatus(row.provider, row.providerReference);
  } else {
    return row.status;
  }

  if (
    status === 'pending' ||
    (row.status === 'cancelled' && status !== 'success')
  ) {
    return row.status;
  }
  await applyPaymentEvent({
    eventId: `${row.provider}:${row.providerReference}:${status}`,
    providerReference: row.providerReference,
    status,
  });
  return status;
};
```

- [ ] **Step 2: Mettre à jour les appelants**

`src/server/api/routers/support.ts` : dans l'import de `@/server/db/utils/support`, remplacer `syncMobileMoneyPayment,` par `syncPayment,`. Dans `syncCheckout`, remplacer :

```ts
      const status = await syncMobileMoneyPayment({
        paymentId: input.paymentId,
      }).catch(() => 'pending' as const);
```

par :

```ts
      const status = await syncPayment({
        paymentId: input.paymentId,
      }).catch(() => 'pending' as const);
```

`src/app/api/webhook/momo/route.ts` et `src/app/api/webhook/airtel/route.ts` : remplacer chaque occurrence de `syncMobileMoneyPayment` par `syncPayment` (import et appel ; les arguments ne changent pas).

`src/server/db/utils/recurring.ts` : dans l'import de `./support`, remplacer `syncMobileMoneyPayment,` par `syncPayment,`. Dans `closeStalePendingPayments`, remplacer :

```ts
    // The operator may know the final status even if nobody polled.
    const status = isMobileMoneyOperator(row.provider)
      ? await syncMobileMoneyPayment({ paymentId: row.id }).catch(
          () => 'pending'
        )
      : 'pending';
```

par :

```ts
    // The provider may know the final status even if nobody polled.
    const status = await syncPayment({ paymentId: row.id }).catch(
      () => 'pending'
    );
```

`isMobileMoneyOperator` reste utilisé dans `renewPlan` : garder l'import.

- [ ] **Step 3: Vérifier qu'il ne reste aucune référence**

Run: `rg -n "syncMobileMoneyPayment" src`
Expected: aucune ligne.

Run: `bunx biome check --write src/server/db/utils/support.ts src/server/db/utils/recurring.ts src/server/api/routers/support.ts src/app/api/webhook/momo/route.ts src/app/api/webhook/airtel/route.ts && bun run typecheck && bun run test`
Expected: aucune erreur, tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/utils/support.ts src/server/db/utils/recurring.ts src/server/api/routers/support.ts src/app/api/webhook/momo/route.ts src/app/api/webhook/airtel/route.ts
git commit -m "refactor(payments): one syncPayment for every provider"
```

---

### Task 4: Démarrer un paiement Nyole (serveur)

**Files:**
- Modify: `src/server/db/utils/support.ts` (`startNyolePayment`, `getCheckout`)
- Modify: `src/server/api/routers/support.ts` (`PAY_ERRORS`, `payWithNyole`)

**Interfaces:**
- Consumes: `createNyoleSession`, `nyoleCheckoutUrl`, `nyoleEnabled`, `NyoleError`, `NYOLE_PROVIDER`, `NYOLE_PENDING_PREFIX` (tâche 1) ; `applyPaymentEvent` (existant).
- Produces:
  - `startNyolePayment(input: { paymentId: string }): Promise<{ ok: true; url: string } | { error: 'not-configured' | 'not-payable' | 'provider-refused'; message?: string }>`
  - `getCheckout(...)` renvoie en plus `resumeUrl: string | null`.
  - tRPC `support.payWithNyole` : entrée `{ paymentId: string (uuid) }`, sortie `{ url: string }`.

- [ ] **Step 1: `startNyolePayment`**

Compléter l'import de `@/server/payments/nyole` dans `support.ts` :

```ts
import {
  NYOLE_PENDING_PREFIX,
  NYOLE_PROVIDER,
  NyoleError,
  type PaymentStatus,
  createNyoleSession,
  getNyoleSessionStatus,
  nyoleCheckoutUrl,
  nyoleEnabled,
} from '@/server/payments/nyole';
```

Ajouter juste avant `syncPayment` :

```ts
function checkoutReturnUrl(paymentId: string) {
  const base = env.NEXT_PUBLIC_URL.replace(TRAILING_SLASH_RE, '');
  return `${base}/support/checkout/${paymentId}`;
}

// The payer chose Nyole on the checkout page: reserve the payment, create a
// hosted session and send them there. Idempotency-Key = payment id, so a
// double click or a retry after a crash gets the same session back.
export const startNyolePayment = async (input: { paymentId: string }) => {
  if (!nyoleEnabled()) {
    return { error: 'not-configured' as const };
  }
  const placeholder = `${NYOLE_PENDING_PREFIX}${input.paymentId}`;
  await db
    .update(payment)
    .set({
      provider: NYOLE_PROVIDER,
      providerReference: placeholder,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(payment.id, input.paymentId),
        eq(payment.provider, 'sandbox'),
        eq(payment.status, 'pending')
      )
    );

  const row = await db.query.payment.findFirst({
    where: (table, { eq: equals }) => equals(table.id, input.paymentId),
    columns: {
      provider: true,
      providerReference: true,
      status: true,
      amount: true,
      currency: true,
    },
  });
  if (!row || row.provider !== NYOLE_PROVIDER || row.status !== 'pending') {
    return { error: 'not-payable' as const };
  }
  if (!row.providerReference.startsWith(NYOLE_PENDING_PREFIX)) {
    return { ok: true as const, url: nyoleCheckoutUrl(row.providerReference) };
  }

  try {
    const session = await createNyoleSession({
      paymentId: input.paymentId,
      amount: row.amount,
      currency: row.currency,
      returnUrl: checkoutReturnUrl(input.paymentId),
    });
    await db
      .update(payment)
      .set({ providerReference: session.id, updatedAt: new Date() })
      .where(
        and(
          eq(payment.id, input.paymentId),
          eq(payment.providerReference, placeholder)
        )
      );
    return { ok: true as const, url: session.url };
  } catch (error) {
    await applyPaymentEvent({
      eventId: `${NYOLE_PROVIDER}:${placeholder}:request-failed`,
      providerReference: placeholder,
      status: 'failed',
    });
    return {
      error: 'provider-refused' as const,
      message: error instanceof NyoleError ? error.message : undefined,
    };
  }
};
```

- [ ] **Step 2: `getCheckout` expose l'URL de reprise**

Dans `getCheckout`, ajouter `providerReference: true,` aux `columns`, et dans l'objet renvoyé, après `canPay: ...,` :

```ts
    // Nyole session open: the payer can go back to it.
    resumeUrl:
      row.provider === NYOLE_PROVIDER &&
      row.status === 'pending' &&
      !row.providerReference.startsWith(NYOLE_PENDING_PREFIX)
        ? nyoleCheckoutUrl(row.providerReference)
        : null,
```

Remplacer aussi le commentaire au-dessus de `canPay` par :

```ts
    // No provider chosen yet: the payer can pick MTN MoMo, Airtel or Nyole.
```

- [ ] **Step 3: Mutation tRPC**

Dans `src/server/api/routers/support.ts`, ajouter `startNyolePayment,` à l'import de `@/server/db/utils/support`, et dans `PAY_ERRORS` après `'operator-refused'` :

```ts
  'provider-refused':
    'Nyole n’a pas pu ouvrir le paiement. Réessayez avec un nouveau don.',
```

Après la procédure `pay`, ajouter :

```ts
  // Creates the Nyole session; the client then redirects to its url.
  payWithNyole: rateLimitedSupport
    .input(CheckoutPaymentSchema)
    .mutation(async ({ input }) => {
      const result = await startNyolePayment(input);
      if ('error' in result) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: PAY_ERRORS[result.error],
        });
      }
      return { url: result.url };
    }),
```

- [ ] **Step 4: Vérifier**

Run: `bunx biome check --write src/server/db/utils/support.ts src/server/api/routers/support.ts && bun run typecheck && bun run test`
Expected: aucune erreur, tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/utils/support.ts src/server/api/routers/support.ts
git commit -m "feat(payments): start a Nyole checkout session"
```

---

### Task 5: Webhook Nyole

**Files:**
- Create: `src/app/api/webhook/nyole/route.ts`

**Interfaces:**
- Consumes: `verifyNyoleSignature`, `nyoleWebhookTarget` (tâche 1), `syncPayment` (tâche 3), `env.NYOLE_SECRET_KEY`.
- Produces: `POST /api/webhook/nyole` → 401 si signature invalide, sinon 200 `{ ok: true }`.

- [ ] **Step 1: Implémentation**

`src/app/api/webhook/nyole/route.ts` :

```ts
import { env } from '@/env.mjs';
import { syncPayment } from '@/server/db/utils/support';
import {
  nyoleWebhookTarget,
  verifyNyoleSignature,
} from '@/server/payments/nyole';

// Nyole signs every event (X-Afriflow-Signature). The payload only says which
// payment to re-check: the status always comes from the Nyole API. Answer 200
// even for unknown payments so Nyole stops retrying.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = env.NYOLE_SECRET_KEY;
  const valid =
    !!secret &&
    verifyNyoleSignature({
      secret,
      rawBody,
      header: request.headers.get('x-afriflow-signature'),
      nowSeconds: Math.floor(Date.now() / 1000),
    });
  if (!valid) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const target = nyoleWebhookTarget(rawBody);
  if (target) {
    await syncPayment(target).catch(() => null);
  }
  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Vérifier**

Run: `bunx biome check --write src/app/api/webhook/nyole/route.ts && bun run typecheck`
Expected: aucune erreur. (Le comportement est vérifié par curl en tâche 7.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhook/nyole/route.ts
git commit -m "feat(payments): signed Nyole webhook"
```

---

### Task 6: Page de paiement

**Files:**
- Create: `src/hooks/use-payment-polling.ts`
- Create: `src/components/forms/nyole-pending.tsx`
- Modify: `src/components/forms/mobile-money-checkout.tsx`
- Modify: `src/app/support/checkout/[paymentId]/page.tsx`

**Interfaces:**
- Consumes: tRPC `support.payWithNyole`, `support.syncCheckout` ; `getCheckout().resumeUrl` (tâche 4) ; `nyoleEnabled()` (tâche 1).
- Produces: `usePaymentPolling(paymentId: string, enabled: boolean): void` ; `<NyolePending paymentId resumeUrl retryHref />` ; prop `nyole: boolean` sur `MobileMoneyCheckout`.

- [ ] **Step 1: Hook de polling**

`src/hooks/use-payment-polling.ts` :

```ts
'use client';

import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const POLL_MS = 3000;

// While a payment is pending, asks the server to re-read its status and
// refreshes the page once it is final.
export function usePaymentPolling(paymentId: string, enabled: boolean) {
  const router = useRouter();
  const { mutateAsync: syncStatus } = api.support.syncCheckout.useMutation();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let stopped = false;
    const timer = setInterval(async () => {
      const result = await syncStatus({ paymentId }).catch(() => null);
      if (!stopped && result && result.status !== 'pending') {
        stopped = true;
        clearInterval(timer);
        router.refresh();
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [enabled, paymentId, syncStatus, router]);
}
```

- [ ] **Step 2: Carte Nyole dans le formulaire**

Dans `src/components/forms/mobile-money-checkout.tsx` :

1. Imports : remplacer

```ts
import { Check, ChevronDown, Loader2, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
```

par

```ts
import { usePaymentPolling } from '@/hooks/use-payment-polling';
import {
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  Smartphone,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
```

2. Remplacer le bloc des types et de `BRANDS` (de `type Operator = ...` jusqu'à la fin de l'objet `BRANDS`) par :

```ts
type Operator = 'mtn_momo' | 'airtel_money';
type Choice = Operator | 'nyole';
type Offer = { operator: Operator; countries: string[] };

// Official logos in public/payments (trademarks of their owners). Airtel:
// Wikimedia Commons, public domain text logo. Nyole has no logo here: its
// page offers cards and mobile money, so a card icon stands for it.
const BRANDS: Record<
  Choice,
  {
    name: string;
    subtitle: string;
    logo: string | null;
    tile: string;
    logoClass: string;
  }
> = {
  mtn_momo: {
    name: 'MTN MoMo',
    subtitle: 'Mobile Money',
    // App icon provided by the project (MoMo from MTN).
    logo: '/payments/momo.png',
    tile: '',
    // The icon has a transparent margin: zoom in to fill the tile.
    logoClass: 'size-full scale-[1.2] object-contain',
  },
  airtel_money: {
    name: 'Airtel Money',
    subtitle: 'Mobile Money',
    logo: '/payments/airtel.svg',
    tile: 'bg-white ring-1 ring-black/5',
    logoClass: 'h-7 w-auto',
  },
  nyole: {
    name: 'Carte ou Mobile Money',
    subtitle: 'Visa, Mastercard, MTN, Airtel · via Nyole',
    logo: null,
    tile: 'bg-muted',
    logoClass: '',
  },
};
```

3. Supprimer `const POLL_MS = 3000;`.

4. Dans `OperatorCard`, remplacer le type de prop `operator: Operator;` par `operator: Choice;`, et remplacer le contenu du `<span>` de la tuile et celui du sous-titre :

```tsx
      <span
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl',
          brand.tile
        )}
      >
        {brand.logo ? (
          <Image
            src={brand.logo}
            alt=""
            width={40}
            height={40}
            className={brand.logoClass}
            unoptimized={brand.logo.endsWith('.svg')}
          />
        ) : (
          <CreditCard className="size-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-sm">{brand.name}</span>
        <span className="block text-muted-foreground text-xs">
          {brand.subtitle}
        </span>
      </span>
```

5. Remplacer tout le composant `MobileMoneyCheckout` (commentaire compris) par :

```tsx
// Payment method choice. Direct MTN MoMo / Airtel: phone number, then wait
// while the payer approves the USSD prompt. Nyole: redirect to its page.
export default function MobileMoneyCheckout({
  paymentId,
  awaitingApproval = false,
  offers,
  nyole,
}: {
  paymentId: string;
  // true when the request was already sent (e.g. the page was reloaded).
  awaitingApproval?: boolean;
  // Operators configured on the server, with the countries they serve.
  offers: Offer[];
  // Nyole configured on the server.
  nyole: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>(
    offers[0]?.operator ?? (nyole ? 'nyole' : 'mtn_momo')
  );
  const countries =
    offers.find((offer) => offer.operator === choice)?.countries ?? [];
  const [country, setCountry] = useState(defaultCountry(countries));
  const [phone, setPhone] = useState('');
  const [waiting, setWaiting] = useState(awaitingApproval);
  const pay = api.support.pay.useMutation();
  const payWithNyole = api.support.payWithNyole.useMutation();
  const error = choice === 'nyole' ? payWithNyole.error : pay.error;
  const pending = pay.isPending || payWithNyole.isPending;
  // Kept disabled while the browser leaves for Nyole.
  const [redirecting, setRedirecting] = useState(false);

  usePaymentPolling(paymentId, waiting);

  if (waiting) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-muted">
          <Smartphone className="size-5" />
          <span className="absolute inset-0 animate-ping rounded-full bg-muted-foreground/10" />
        </span>
        <p className="font-medium">Validez le paiement sur votre téléphone</p>
        <p className="text-muted-foreground text-sm">
          Entrez votre code secret dans la fenêtre qui s’affiche. Cette page se
          met à jour toute seule.
        </p>
      </div>
    );
  }

  const submitLabel =
    choice === 'nyole'
      ? 'Continuer vers Nyole'
      : `Payer avec ${BRANDS[choice].name}`;

  const choices: Choice[] = [
    ...offers.map((offer) => offer.operator),
    ...(nyole ? (['nyole'] as const) : []),
  ];

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          if (choice === 'nyole') {
            const { url } = await payWithNyole.mutateAsync({ paymentId });
            setRedirecting(true);
            window.location.assign(url);
            return;
          }
          await pay.mutateAsync({ paymentId, operator: choice, country, phone });
          setWaiting(true);
        } catch {
          // The error is shown below. A refused request marks the payment
          // failed: refresh so the page shows it.
          router.refresh();
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">Moyen de paiement</span>
        <fieldset
          aria-label="Moyen de paiement"
          className={cn(
            'grid gap-2',
            choices.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {choices.map((item) => (
            <OperatorCard
              key={item}
              operator={item}
              selected={choice === item}
              onSelect={() => {
                setChoice(item);
                const offer = offers.find((o) => o.operator === item);
                // Keep the country valid for the chosen operator.
                if (offer && !offer.countries.includes(country)) {
                  setCountry(defaultCountry(offer.countries));
                }
              }}
            />
          ))}
        </fieldset>
      </div>

      {choice !== 'nyole' && (
        <PhoneField
          countries={countries}
          country={country}
          onCountryChange={setCountry}
          value={phone}
          onChange={setPhone}
        />
      )}

      {error && <p className={AURA_ERROR}>{error.message}</p>}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className={AURA_PRIMARY_BUTTON}
          disabled={
            pending || redirecting || (choice !== 'nyole' && !phone)
          }
        >
          {pending || redirecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            submitLabel
          )}
        </button>
        <p className="text-center text-muted-foreground text-xs">
          {choice === 'nyole'
            ? 'Vous serez redirigé vers la page de paiement sécurisée Nyole.'
            : 'Vous recevrez une demande de validation sur votre téléphone.'}
        </p>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Composant « paiement Nyole en attente »**

`src/components/forms/nyole-pending.tsx` :

```tsx
'use client';

import {
  AURA_PRIMARY_BUTTON,
  AURA_SECONDARY_BUTTON,
} from '@/components/forms/aura-fields';
import { usePaymentPolling } from '@/hooks/use-payment-polling';
import Link from 'next/link';

// Nyole session open: back from Nyole (paid or not) or page reopened. The
// status refreshes by itself; the payer can resume or start over.
export default function NyolePending({
  paymentId,
  resumeUrl,
  retryHref,
}: {
  paymentId: string;
  resumeUrl: string;
  retryHref: string;
}) {
  usePaymentPolling(paymentId, true);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-muted-foreground text-sm">
        Si vous avez déjà payé, cette page se met à jour toute seule.
      </p>
      <a href={resumeUrl} className={AURA_PRIMARY_BUTTON}>
        Reprendre le paiement sur Nyole
      </a>
      <Link href={retryHref} className={AURA_SECONDARY_BUTTON}>
        Faire un nouveau don
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Page de paiement**

Dans `src/app/support/checkout/[paymentId]/page.tsx` :

Imports, ajouter :

```ts
import NyolePending from '@/components/forms/nyole-pending';
import { nyoleEnabled } from '@/server/payments/nyole';
```

Remplacer :

```ts
  const offers = configuredOperators();
  // Operator not chosen yet: the form replaces the "pending" notice.
  const choosing = checkout.canPay;
```

par :

```ts
  const offers = configuredOperators();
  const nyole = nyoleEnabled();
  const hasMethods = offers.length > 0 || nyole;
  // Provider not chosen yet: the form replaces the "pending" notice.
  const choosing = checkout.canPay;
```

Remplacer :

```tsx
        {((choosing && offers.length > 0) || awaitingApproval) && (
          <MobileMoneyCheckout
            paymentId={checkout.id}
            awaitingApproval={awaitingApproval}
            offers={offers}
          />
        )}

        {choosing && offers.length === 0 && (
```

par :

```tsx
        {((choosing && hasMethods) || awaitingApproval) && (
          <MobileMoneyCheckout
            paymentId={checkout.id}
            awaitingApproval={awaitingApproval}
            offers={offers}
            nyole={nyole}
          />
        )}

        {checkout.resumeUrl && (
          <NyolePending
            paymentId={checkout.id}
            resumeUrl={checkout.resumeUrl}
            retryHref={`/support/${checkout.personalitySlug}`}
          />
        )}

        {choosing && !hasMethods && (
```

- [ ] **Step 5: Vérifier**

Run: `bunx biome check --write src/hooks/use-payment-polling.ts src/components/forms/mobile-money-checkout.tsx src/components/forms/nyole-pending.tsx "src/app/support/checkout/[paymentId]/page.tsx" && bun run typecheck && bun run test`
Expected: aucune erreur, tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-payment-polling.ts src/components/forms/mobile-money-checkout.tsx src/components/forms/nyole-pending.tsx "src/app/support/checkout/[paymentId]/page.tsx"
git commit -m "feat(payments): Nyole option on the checkout page"
```

---

### Task 7: Vérification de bout en bout en mode test

**Files:** aucun changement attendu. Tout correctif trouvé ici retourne dans la tâche qui possède le code, avec son commit.

Prérequis : `.env` contient `NYOLE_SECRET_KEY=af_test_sec_…` (vérifier le préfixe sans afficher la clé : `grep -E "^NYOLE_SECRET_KEY=af_test_" .env | wc -l` → `1`). **Demander l'accord de l'utilisateur** : ces étapes créent des dons de test dans la base `DATABASE_URL`.

- [ ] **Step 1: Build et serveur de prod**

Le dev server Turbopack boucle en HMR sur `/[link]` dans cet environnement : tester sur le build.

```bash
bun run build
```

Puis lancer la config `openbio-prod` (port 3100) via `preview_start`.

- [ ] **Step 2: Webhook — signature refusée**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3100/api/webhook/nyole -H "content-type: application/json" -d '{"data":{"id":"x"}}'
```

Expected: `401`.

Même requête avec `-H "x-afriflow-signature: t=1,v1=00"` → `401`.

- [ ] **Step 3: Webhook — signé, paiement inconnu, JSON invalide**

Script jetable `C:/Users/pc/AppData/Local/Temp/claude/D--AuraSpot/04eeab3c-217a-46fc-af7e-0f5dce74370a/scratchpad/sign.ts` (hors du dépôt) :

```ts
import { createHmac } from 'node:crypto';
const [body = '{}'] = process.argv.slice(2);
const t = Math.floor(Date.now() / 1000);
const v1 = createHmac('sha256', process.env.NYOLE_SECRET_KEY ?? '')
  .update(`${t}.${body}`)
  .digest('hex');
process.stdout.write(`t=${t},v1=${v1}`);
```

```bash
BODY='{"data":{"id":"cs_inconnu"}}'
SIG=$(bun --env-file=.env C:/Users/pc/AppData/Local/Temp/claude/D--AuraSpot/04eeab3c-217a-46fc-af7e-0f5dce74370a/scratchpad/sign.ts "$BODY")
curl -s -w " %{http_code}\n" -X POST http://localhost:3100/api/webhook/nyole -H "x-afriflow-signature: $SIG" -d "$BODY"
BODY='pas du json'
SIG=$(bun --env-file=.env C:/Users/pc/AppData/Local/Temp/claude/D--AuraSpot/04eeab3c-217a-46fc-af7e-0f5dce74370a/scratchpad/sign.ts "$BODY")
curl -s -w " %{http_code}\n" -X POST http://localhost:3100/api/webhook/nyole -H "x-afriflow-signature: $SIG" -d "$BODY"
```

Expected: `{"ok":true} 200` deux fois.

- [ ] **Step 4: Parcours succès**

Dans le navigateur : `http://localhost:3100/support/kaiserstyve`, don unique de 1 000 F → page de paiement. Vérifier que la carte « Carte ou Mobile Money · via Nyole » apparaît à côté de MTN MoMo / Airtel, que le champ téléphone disparaît quand on la choisit, et que le bouton dit « Continuer vers Nyole ». Cliquer : redirection vers `app.nyole.com/checkout/<id>` avec bandeau mode test.

Récupérer l'id de session :

```bash
psql "$DATABASE_URL" -tAc "select id, provider_reference, status from payment where provider='nyole' order by created_at desc limit 1"
```

Expected: `provider_reference` ne commence pas par `nyole_pending_`, `status` = `pending`.

Simuler le succès :

```bash
curl -s -X POST https://app.nyole.com/api/checkout/sandbox -H "content-type: application/json" -d '{"transactionId":"<provider_reference>","issue":"succes"}'
```

Ouvrir `http://localhost:3100/support/checkout/<payment id>` : le polling passe la page à « Le paiement est reçu. Merci. » en moins de 10 s.

```bash
psql "$DATABASE_URL" -tAc "select p.status, l.entry_type, l.amount from payment p left join ledger_entry l on l.payment_id = p.id where p.id = '<payment id>'"
```

Expected: `success|…|1000` (une seule écriture de crédit, montant plein).

- [ ] **Step 5: Double clic**

Nouveau don ; sur la page de paiement, dans la console du navigateur, envoyer deux fois la mutation en parallèle :

```js
const call = () => fetch('/api/trpc/support.payWithNyole?batch=1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 0: { json: { paymentId: location.pathname.split('/').pop() } } }) }).then(r => r.json());
const [a, b] = await Promise.all([call(), call()]);
[a[0].result?.data?.json?.url, b[0].result?.data?.json?.url]
```

Expected: deux URL identiques ; en base une seule ligne `payment` pour ce don, `provider='nyole'`.

- [ ] **Step 6: Retour sans payer**

Ouvrir `http://localhost:3100/support/checkout/<payment id du step 5>` : la page affiche « Le paiement est en attente. », « Reprendre le paiement sur Nyole » (lien vers la session) et « Faire un nouveau don ».

- [ ] **Step 7: Parcours échec**

Simuler `"issue":"echec"` sur la session du step 5 ; la page passe à « Le paiement a échoué. » avec « Refaire un don ». En base : `status = failed`, aucune ligne `ledger_entry` pour ce paiement.

- [ ] **Step 8: Nyole injoignable**

Arrêter le serveur, lancer avec une base Nyole invalide pour simuler une panne :

```bash
NYOLE_BASE_URL=https://nyole.invalid bun run start -- -p 3101
```

Nouveau don sur `http://localhost:3101`, choisir Nyole. Expected : message « Nyole n’a pas pu ouvrir le paiement. Réessayez avec un nouveau don. », la page passe à « Le paiement a échoué. ». En base : `status = failed`, `provider_reference` = `nyole_pending_<id>`. Arrêter ce serveur.

- [ ] **Step 9: Mobile Money direct inchangé**

Sur un nouveau don, choisir MTN MoMo : le champ téléphone et « Payer avec MTN MoMo » sont là comme avant (pas besoin d'aller au bout du paiement).

- [ ] **Step 10: Vérifications finales**

Run: `bun run typecheck && bun run test && bun run lint`
Expected: aucune erreur.

Proposer à l'utilisateur de supprimer les dons de test créés (lister les `payment.id` concernés ; ne rien supprimer sans son accord).
