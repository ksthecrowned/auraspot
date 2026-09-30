import { env } from '@/env.mjs';

export const SUPPORT_CURRENCY = 'XAF';
export const MIN_SUPPORT_AMOUNT = 100;
export const MAX_SUPPORT_AMOUNT = 2_000_000;

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
