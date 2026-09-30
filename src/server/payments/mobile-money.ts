import { env } from '@/env.mjs';

const TRAILING_SLASH_RE = /\/$/;
const DASH_RE = /-/g;

// Mobile money collections (USSD push): the payer approves on their phone,
// then we read the final status from the operator API.
//
// MTN MoMo  — Collection API: POST /collection/v1_0/requesttopay,
//             GET /collection/v1_0/requesttopay/{referenceId}.
//             Sandbox only accepts EUR and target environment "sandbox".
// Airtel    — Collection API v1: POST /merchant/v1/payments/,
//             GET /standard/v1/payments/{id} (TS success, TF failed,
//             TE expired, TIP/TA in progress).

export const MOBILE_MONEY_OPERATORS = ['mtn_momo', 'airtel_money'] as const;
export type MobileMoneyOperator = (typeof MOBILE_MONEY_OPERATORS)[number];

export type ProviderStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export class MobileMoneyError extends Error {}

type CachedToken = { value: string; expiresAt: number };
const tokens = new Map<MobileMoneyOperator, CachedToken>();

function cachedToken(operator: MobileMoneyOperator) {
  const token = tokens.get(operator);
  // Renew one minute before expiry.
  return token && token.expiresAt - 60_000 > Date.now() ? token.value : null;
}

// Payer number, built with toMsisdn() from src/lib/phone-countries.ts.
export type PayerNumber = {
  iso: string;
  // International digits, e.g. 242061234567 (MoMo partyId).
  msisdn: string;
  // Without the country code, e.g. 061234567 (Airtel msisdn).
  national: string;
};

// Countries offered at checkout (see src/lib/phone-countries.ts).
const MTN_COUNTRIES = ['CG'];

// ---- MTN MoMo ----

function momoConfig() {
  const {
    MOMO_BASE_URL,
    MOMO_TARGET_ENVIRONMENT,
    MOMO_COLLECTION_SUBSCRIPTION_KEY,
    MOMO_API_USER,
    MOMO_API_KEY,
    MOMO_CURRENCY,
  } = env;
  if (!(MOMO_COLLECTION_SUBSCRIPTION_KEY && MOMO_API_USER && MOMO_API_KEY)) {
    throw new MobileMoneyError('MTN MoMo n’est pas configuré');
  }
  const targetEnvironment = MOMO_TARGET_ENVIRONMENT ?? 'sandbox';
  return {
    baseUrl: (MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com').replace(
      TRAILING_SLASH_RE,
      ''
    ),
    targetEnvironment,
    subscriptionKey: MOMO_COLLECTION_SUBSCRIPTION_KEY,
    apiUser: MOMO_API_USER,
    apiKey: MOMO_API_KEY,
    currency:
      MOMO_CURRENCY ?? (targetEnvironment === 'sandbox' ? 'EUR' : 'XAF'),
  };
}

async function momoToken() {
  const cached = cachedToken('mtn_momo');
  if (cached) {
    return cached;
  }
  const config = momoConfig();
  const basic = Buffer.from(`${config.apiUser}:${config.apiKey}`).toString(
    'base64'
  );
  const res = await fetch(`${config.baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
    },
  });
  if (!res.ok) {
    throw new MobileMoneyError(`MoMo token refusé (${res.status})`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  tokens.set('mtn_momo', {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

async function momoRequestToPay(input: {
  reference: string;
  externalId: string;
  amount: number;
  payer: PayerNumber;
  callbackUrl?: string;
}) {
  const config = momoConfig();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${await momoToken()}`,
    'X-Reference-Id': input.reference,
    'X-Target-Environment': config.targetEnvironment,
    'Ocp-Apim-Subscription-Key': config.subscriptionKey,
    'Content-Type': 'application/json',
  };
  if (input.callbackUrl) {
    headers['X-Callback-Url'] = input.callbackUrl;
  }

  const res = await fetch(`${config.baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount: String(input.amount),
      currency: config.currency,
      externalId: input.externalId,
      payer: { partyIdType: 'MSISDN', partyId: input.payer.msisdn },
      payerMessage: 'Don AuraSpot',
      payeeNote: 'Don AuraSpot',
    }),
  });
  if (res.status !== 202) {
    throw new MobileMoneyError(`MoMo a refusé la demande (${res.status})`);
  }
}

async function momoStatus(reference: string): Promise<ProviderStatus> {
  const config = momoConfig();
  const res = await fetch(
    `${config.baseUrl}/collection/v1_0/requesttopay/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${await momoToken()}`,
        'X-Target-Environment': config.targetEnvironment,
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
    }
  );
  if (!res.ok) {
    throw new MobileMoneyError(`Statut MoMo indisponible (${res.status})`);
  }
  const data = (await res.json()) as { status?: string; reason?: string };
  if (data.status === 'SUCCESSFUL') {
    return 'success';
  }
  if (data.status === 'FAILED' || data.status === 'REJECTED') {
    return 'failed';
  }
  if (data.status === 'TIMEOUT') {
    return 'cancelled';
  }
  return 'pending';
}

// ---- Airtel Money ----

function airtelConfig() {
  const {
    AIRTEL_BASE_URL,
    AIRTEL_CLIENT_ID,
    AIRTEL_CLIENT_SECRET,
    AIRTEL_COUNTRY,
    AIRTEL_CURRENCY,
  } = env;
  if (!(AIRTEL_CLIENT_ID && AIRTEL_CLIENT_SECRET)) {
    throw new MobileMoneyError('Airtel Money n’est pas configuré');
  }
  return {
    baseUrl: (AIRTEL_BASE_URL ?? 'https://openapiuat.airtel.africa').replace(
      TRAILING_SLASH_RE,
      ''
    ),
    clientId: AIRTEL_CLIENT_ID,
    clientSecret: AIRTEL_CLIENT_SECRET,
    country: AIRTEL_COUNTRY ?? 'CG',
    currency: AIRTEL_CURRENCY ?? 'XAF',
  };
}

async function airtelToken() {
  const cached = cachedToken('airtel_money');
  if (cached) {
    return cached;
  }
  const config = airtelConfig();
  const res = await fetch(`${config.baseUrl}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: '*/*' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) {
    throw new MobileMoneyError(`Airtel token refusé (${res.status})`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number | string;
  };
  tokens.set('airtel_money', {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000,
  });
  return data.access_token;
}

async function airtelHeaders() {
  const config = airtelConfig();
  return {
    Authorization: `Bearer ${await airtelToken()}`,
    'X-Country': config.country,
    'X-Currency': config.currency,
    'Content-Type': 'application/json',
    Accept: '*/*',
  };
}

async function airtelRequestToPay(input: {
  reference: string;
  externalId: string;
  amount: number;
  payer: PayerNumber;
}) {
  const config = airtelConfig();
  const res = await fetch(`${config.baseUrl}/merchant/v1/payments/`, {
    method: 'POST',
    headers: await airtelHeaders(),
    body: JSON.stringify({
      // Shown to the payer; letters and digits only.
      reference: `AuraSpot${input.externalId.replace(DASH_RE, '').slice(0, 12)}`,
      subscriber: {
        country: config.country,
        currency: config.currency,
        msisdn: input.payer.national,
      },
      transaction: {
        amount: input.amount,
        country: config.country,
        currency: config.currency,
        id: input.reference,
      },
    }),
  });
  const data = (await res.json().catch(() => null)) as {
    status?: { success?: boolean; message?: string };
  } | null;
  if (!(res.ok && data?.status?.success)) {
    throw new MobileMoneyError(
      `Airtel a refusé la demande (${data?.status?.message ?? res.status})`
    );
  }
}

async function airtelStatus(reference: string): Promise<ProviderStatus> {
  const config = airtelConfig();
  const res = await fetch(
    `${config.baseUrl}/standard/v1/payments/${reference}`,
    { headers: await airtelHeaders() }
  );
  if (!res.ok) {
    throw new MobileMoneyError(`Statut Airtel indisponible (${res.status})`);
  }
  const data = (await res.json()) as {
    data?: { transaction?: { status?: string } };
  };
  const status = data.data?.transaction?.status;
  if (status === 'TS') {
    return 'success';
  }
  if (status === 'TF') {
    return 'failed';
  }
  if (status === 'TE') {
    return 'cancelled';
  }
  return 'pending';
}

// ---- Public API ----

export function requestToPay(
  operator: MobileMoneyOperator,
  input: {
    reference: string;
    externalId: string;
    amount: number;
    payer: PayerNumber;
    callbackUrl?: string;
  }
) {
  return operator === 'mtn_momo'
    ? momoRequestToPay(input)
    : airtelRequestToPay(input);
}

export function getProviderStatus(
  operator: MobileMoneyOperator,
  reference: string
) {
  return operator === 'mtn_momo'
    ? momoStatus(reference)
    : airtelStatus(reference);
}

export function isMobileMoneyOperator(
  value: string
): value is MobileMoneyOperator {
  return (MOBILE_MONEY_OPERATORS as readonly string[]).includes(value);
}

export type OperatorOffer = {
  operator: MobileMoneyOperator;
  // Countries (ISO) whose numbers this account can charge.
  countries: string[];
};

// Operators whose credentials are set, with the countries they serve. Only
// these are offered at checkout. A production MoMo or Airtel account works
// for one country; the MoMo sandbox accepts any MTN country.
export function configuredOperators(): OperatorOffer[] {
  const offers: OperatorOffer[] = [];
  if (
    env.MOMO_COLLECTION_SUBSCRIPTION_KEY &&
    env.MOMO_API_USER &&
    env.MOMO_API_KEY
  ) {
    const sandbox = (env.MOMO_TARGET_ENVIRONMENT ?? 'sandbox') === 'sandbox';
    offers.push({
      operator: 'mtn_momo',
      countries: sandbox ? MTN_COUNTRIES : [env.MOMO_COUNTRY ?? 'CG'],
    });
  }
  if (env.AIRTEL_CLIENT_ID && env.AIRTEL_CLIENT_SECRET) {
    offers.push({
      operator: 'airtel_money',
      countries: [env.AIRTEL_COUNTRY ?? 'CG'],
    });
  }
  return offers;
}

export function operatorServes(operator: MobileMoneyOperator, iso: string) {
  return configuredOperators().some(
    (offer) => offer.operator === operator && offer.countries.includes(iso)
  );
}
