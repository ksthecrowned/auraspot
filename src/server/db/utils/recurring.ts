import { SUPPORT_CURRENCY } from '@/lib/money';
import { fromStoredPhone } from '@/lib/phone-countries';
import { canReceiveSupport } from '@/lib/support-eligibility';
import {
  isMobileMoneyOperator,
  operatorServes,
} from '@/server/payments/mobile-money';
import { and, eq, isNotNull, lte } from 'drizzle-orm';
import { db } from '../db';
import { link, payment, recurringSupport, support } from '../schema';
import { notifyRenewalRequested } from './recurring-emails';
import {
  RENEWAL_RETRY_DAYS,
  applyPaymentEvent,
  insertPendingPayment,
  startMobileMoneyPayment,
  syncPayment,
} from './support';
import { activeGoalId, closeExpiredGoals } from './support-goal';

// Mobile money cannot debit a wallet without the payer's PIN, so a monthly
// support is renewed by *requesting* a payment each month: a USSD push to
// the number that paid last time, plus an email with a checkout link.

// Pending payments older than this are closed (abandoned checkout, request
// never approved). Their plan then retries or is cancelled.
const STALE_PENDING_MS = RENEWAL_RETRY_DAYS * 24 * 60 * 60 * 1000;

async function closeStalePendingPayments() {
  const staleBefore = new Date(Date.now() - STALE_PENDING_MS);
  const rows = await db
    .select({
      id: payment.id,
      provider: payment.provider,
      providerReference: payment.providerReference,
    })
    .from(payment)
    .where(
      and(eq(payment.status, 'pending'), lte(payment.createdAt, staleBefore))
    );

  let closed = 0;
  for (const row of rows) {
    // The provider may know the final status even if nobody polled.
    const status = await syncPayment({ paymentId: row.id }).catch(
      () => 'pending'
    );
    if (status === 'pending') {
      await applyPaymentEvent({
        eventId: `expire:${row.id}`,
        providerReference: row.providerReference,
        status: 'cancelled',
      });
      closed += 1;
    }
  }
  return closed;
}

async function renewPlan(plan: {
  id: string;
  personalityId: string;
  userId: string;
  amount: number;
  displayName: string | null;
  isPublic: boolean;
  payerOperator: string | null;
  payerPhone: string | null;
}) {
  // Nothing is requested while the fiche cannot receive donations; the plan
  // stays due and renews once the fiche is claimed and verified again.
  const [fiche] = await db
    .select({
      claimStatus: link.claimStatus,
      verificationStatus: link.verificationStatus,
    })
    .from(link)
    .where(eq(link.id, plan.personalityId));
  if (!(fiche && canReceiveSupport(fiche))) {
    return false;
  }

  // Claim the plan: nextChargeAt stays null while this renewal is open, so a
  // second cron run cannot bill twice.
  const [claimed] = await db
    .update(recurringSupport)
    .set({ nextChargeAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(recurringSupport.id, plan.id),
        eq(recurringSupport.status, 'active'),
        isNotNull(recurringSupport.nextChargeAt)
      )
    )
    .returning({ id: recurringSupport.id });
  if (!claimed) {
    return false;
  }

  const [supportRow] = await db
    .insert(support)
    .values({
      personalityId: plan.personalityId,
      userId: plan.userId,
      recurringSupportId: plan.id,
      amount: plan.amount,
      currency: SUPPORT_CURRENCY,
      displayName: plan.displayName,
      isPublic: plan.isPublic,
      goalId: await activeGoalId(plan.personalityId),
    })
    .returning({ id: support.id });
  if (!supportRow) {
    return false;
  }
  const checkout = await insertPendingPayment(supportRow.id, plan.amount);

  let pushSent = false;
  const stored = plan.payerPhone ? fromStoredPhone(plan.payerPhone) : null;
  if (
    stored &&
    plan.payerOperator &&
    isMobileMoneyOperator(plan.payerOperator) &&
    operatorServes(plan.payerOperator, stored.iso)
  ) {
    // A refused request marks the payment failed, which schedules a retry.
    const result = await startMobileMoneyPayment({
      paymentId: checkout.paymentId,
      operator: plan.payerOperator,
      country: stored.iso,
      phone: stored.national,
    });
    pushSent = 'ok' in result;
    if (!pushSent) {
      // Refused (e.g. number no longer valid): the payment is failed and a
      // retry is scheduled, so there is nothing to pay by link right now.
      return true;
    }
  }

  await notifyRenewalRequested({
    planId: plan.id,
    checkoutPath: checkout.checkoutPath,
    pushSent,
  }).catch(() => null);
  return true;
}

// Requests the due monthly payments, for everyone (cron) or one supporter
// (when they open their history).
export async function renewDuePlans(filter: { userId?: string } = {}) {
  const due = await db
    .select({
      id: recurringSupport.id,
      personalityId: recurringSupport.personalityId,
      userId: recurringSupport.userId,
      amount: recurringSupport.amount,
      displayName: recurringSupport.displayName,
      isPublic: recurringSupport.isPublic,
      payerOperator: recurringSupport.payerOperator,
      payerPhone: recurringSupport.payerPhone,
    })
    .from(recurringSupport)
    .where(
      and(
        eq(recurringSupport.status, 'active'),
        lte(recurringSupport.nextChargeAt, new Date()),
        filter.userId ? eq(recurringSupport.userId, filter.userId) : undefined
      )
    );

  let renewed = 0;
  let failed = 0;
  for (const plan of due) {
    try {
      if (await renewPlan(plan)) {
        renewed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { due: due.length, renewed, failed };
}

export async function runRecurringRenewals() {
  const closed = await closeStalePendingPayments();
  const goalsClosed = await closeExpiredGoals();
  const renewals = await renewDuePlans();
  return { closed, goalsClosed, ...renewals };
}
