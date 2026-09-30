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
// A hung call would leave a payment reserved and stall the stale-payment cron.
const REQUEST_TIMEOUT_MS = 10_000;

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

// What the checkout page offers for a pending Nyole payment: go back to the
// open session, or try again when no session was created (Nyole refused or
// did not answer; the payment keeps its placeholder reference).
export function nyoleCheckoutAction(row: {
  provider: string;
  status: PaymentStatus;
  providerReference: string;
}): { kind: 'resume'; url: string } | { kind: 'retry' } | null {
  if (row.provider !== NYOLE_PROVIDER || row.status !== 'pending') {
    return null;
  }
  if (row.providerReference.startsWith(NYOLE_PENDING_PREFIX)) {
    return { kind: 'retry' };
  }
  return { kind: 'resume', url: nyoleCheckoutUrl(row.providerReference) };
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
    {
      headers: { Authorization: `Bearer ${secretKey()}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
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
