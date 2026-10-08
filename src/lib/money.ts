import { env } from '@/env.mjs';

export const SUPPORT_CURRENCY = 'XAF';
export const MIN_SUPPORT_AMOUNT = 100;
export const MAX_SUPPORT_AMOUNT = 50_000;
export const MAX_WITHDRAWAL_AMOUNT = 250_000;
export const NYOLE_HOLD_DAYS = 14;
export const FOUNDER_FREE_MONTHS = 6;

export type BalanceEntry = {
  entryType: 'credit' | 'debit' | 'fee' | 'withdrawal';
  amount: number;
  createdAt: Date;
  paymentId: string | null;
  held: boolean;
};

export function withdrawableBalance(
  entries: BalanceEntry[],
  reserved: number,
  now: Date,
  holdDays: number
) {
  const refundedPaymentIds = new Set(
    entries
      .filter(
        (entry) => entry.entryType === 'debit' && entry.paymentId !== null
      )
      .map((entry) => entry.paymentId)
  );
  const heldEntries = entries.filter(
    (entry) =>
      entry.entryType === 'credit' &&
      entry.held &&
      entry.createdAt.getTime() + holdDays * 86_400_000 > now.getTime() &&
      (entry.paymentId === null || !refundedPaymentIds.has(entry.paymentId))
  );
  const total = entries.reduce(
    (balance, entry) =>
      balance + (entry.entryType === 'credit' ? entry.amount : -entry.amount),
    0
  );
  const held = heldEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return {
    available: Math.max(0, total - held - reserved),
    held,
    nextReleaseAt:
      heldEntries.length > 0
        ? new Date(
            Math.min(
              ...heldEntries.map(
                (entry) => entry.createdAt.getTime() + holdDays * 86_400_000
              )
            )
          )
        : null,
  };
}

export function founderOfferEndsAt(founderSince: Date): Date {
  const targetMonth =
    founderSince.getUTCFullYear() * 12 +
    founderSince.getUTCMonth() +
    FOUNDER_FREE_MONTHS;
  const year = Math.floor(targetMonth / 12);
  const month = targetMonth % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(founderSince.getUTCDate(), lastDay);

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      founderSince.getUTCHours(),
      founderSince.getUTCMinutes(),
      founderSince.getUTCSeconds(),
      founderSince.getUTCMilliseconds()
    )
  );
}

export function commissionBpsFor(
  founderSince: Date | null,
  now: Date,
  defaultBps: number
) {
  if (founderSince && now < founderOfferEndsAt(founderSince)) {
    return 0;
  }
  return defaultBps;
}

export function supportCommissionBps() {
  return env.SUPPORT_COMMISSION_BPS;
}

export function splitWithdrawal(grossAmount: number, commissionBps: number) {
  const commissionAmount = Math.floor((grossAmount * commissionBps) / 10_000);
  return {
    commissionAmount,
    netAmount: grossAmount - commissionAmount,
  };
}

const THOUSANDS_RE = /\B(?=(\d{3})+(?!\d))/g;

// "12 500". Not Intl: its narrow no-break space (U+202F) is missing from the
// brand font and can differ between Node and the browser (hydration).
export function formatThousands(value: number) {
  return String(value).replace(THOUSANDS_RE, '\u00a0');
}

export function formatFcfa(amount: number) {
  return `${formatThousands(amount)}\u00a0FCFA`;
}
