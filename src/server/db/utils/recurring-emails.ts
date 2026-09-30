import SupportRenewalEmail from '@/components/emails/support-renewal';
import { formatFcfa } from '@/lib/money';
import { SITE_URL } from '@/lib/site';
import { sendEmail } from '@/server/emails';
import { db } from '../db';

async function planForEmail(planId: string) {
  const plan = await db.query.recurringSupport.findFirst({
    where: (table, { eq }) => eq(table.id, planId),
    columns: { amount: true },
    with: {
      user: { columns: { email: true } },
      personality: { columns: { name: true, link: true } },
    },
  });
  return plan?.user?.email && plan.personality ? plan : null;
}

export async function notifyRenewalRequested(input: {
  planId: string;
  checkoutPath: string;
  pushSent: boolean;
}) {
  const plan = await planForEmail(input.planId);
  if (!plan) {
    return;
  }
  await sendEmail({
    to: [plan.user.email],
    subject: `Votre don mensuel à ${plan.personality.name}`,
    react: SupportRenewalEmail({
      kind: 'requested',
      personalityName: plan.personality.name,
      amount: formatFcfa(plan.amount),
      actionUrl: `${SITE_URL}${input.checkoutPath}`,
      pushSent: input.pushSent,
    }),
  });
}

export async function notifyPlanPaused(planId: string) {
  const plan = await planForEmail(planId);
  if (!plan) {
    return;
  }
  await sendEmail({
    to: [plan.user.email],
    subject: `Don mensuel à ${plan.personality.name} en pause`,
    react: SupportRenewalEmail({
      kind: 'paused',
      personalityName: plan.personality.name,
      amount: formatFcfa(plan.amount),
      actionUrl: `${SITE_URL}/support/${plan.personality.link}?amount=${plan.amount}`,
    }),
  });
}
