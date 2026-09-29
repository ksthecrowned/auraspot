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

export function formatFcfa(amount: number) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)}\u00a0FCFA`;
}
