import GoalReachedEmail from '@/components/emails/goal-reached';
import SupportMessagesEmail from '@/components/emails/support-messages';
import SupportThankedEmail from '@/components/emails/support-thanked';
import { formatFcfa } from '@/lib/money';
import { firstNameOf } from '@/lib/personality';
import { sendEmail } from '@/server/emails';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../db';
import { link, payment, personalityManager, support, user } from '../schema';
import { claimReachedGoal, releaseReachedClaim } from './support-goal';

async function deliver(input: {
  to: string[];
  subject: string;
  react: Parameters<typeof sendEmail>[0]['react'];
}) {
  if (input.to.length === 0) {
    return;
  }
  const result = await sendEmail(input);
  if (result.error) {
    throw new Error(result.error.message);
  }
}

async function ficheRecipients(personalityId: string) {
  const fiche = await db.query.link.findFirst({
    where: (table, { eq: equals }) => equals(table.id, personalityId),
    columns: { name: true, link: true, status: true },
    with: { user: { columns: { email: true } } },
  });
  if (!fiche || fiche.status !== 'active') {
    return null;
  }
  const managers = await db
    .select({ email: user.email })
    .from(personalityManager)
    .innerJoin(user, eq(user.id, personalityManager.userId))
    .where(eq(personalityManager.personalityId, personalityId));
  const emails = new Set<string>();
  if (fiche.user?.email) {
    emails.add(fiche.user.email);
  }
  for (const manager of managers) {
    emails.add(manager.email);
  }
  return {
    name: fiche.name,
    slug: fiche.link,
    emails: [...emails],
  };
}

async function sendOneDigest(personalityId: string, supportIds: string[]) {
  const fiche = await ficheRecipients(personalityId);
  if (!fiche || fiche.emails.length === 0) {
    return false;
  }
  await deliver({
    to: fiche.emails,
    subject:
      supportIds.length > 1
        ? `${supportIds.length} nouveaux messages de vos soutiens`
        : '1 nouveau message de vos soutiens',
    react: SupportMessagesEmail({
      count: supportIds.length,
      personalityName: fiche.name,
      slug: fiche.slug,
    }),
  });
  await db
    .update(support)
    .set({ messageNotifiedAt: new Date() })
    .where(inArray(support.id, supportIds));
  return true;
}

export async function sendDedicationDigests() {
  let sent = 0;
  const pending = await db
    .selectDistinct({
      id: support.id,
      personalityId: support.personalityId,
    })
    .from(support)
    .innerJoin(
      payment,
      and(eq(payment.supportId, support.id), eq(payment.status, 'success'))
    )
    .innerJoin(link, eq(link.id, support.personalityId))
    .where(
      and(
        isNotNull(support.message),
        isNull(support.messageHiddenAt),
        isNull(support.messageNotifiedAt),
        eq(support.isPublic, true),
        eq(link.status, 'active')
      )
    );
  const byFiche = new Map<string, string[]>();
  for (const row of pending) {
    const ids = byFiche.get(row.personalityId) ?? [];
    ids.push(row.id);
    byFiche.set(row.personalityId, ids);
  }
  for (const [personalityId, supportIds] of byFiche) {
    try {
      if (await sendOneDigest(personalityId, supportIds)) {
        sent += 1;
      }
    } catch {
      // The next daily run retries messages that are still unmarked.
    }
  }
  return { sent };
}

export async function notifySupportThanked(supportId: string) {
  const row = await db.query.support.findFirst({
    where: (table, { eq: equals }) => equals(table.id, supportId),
    columns: { thankYouReply: true },
    with: {
      user: { columns: { email: true } },
      personality: { columns: { name: true, link: true } },
    },
  });
  if (!row?.user?.email || !row.personality) {
    return;
  }
  const firstName = firstNameOf(row.personality.name);
  await deliver({
    to: [row.user.email],
    subject: `${firstName} vous remercie`,
    react: SupportThankedEmail({
      firstName,
      personalityName: row.personality.name,
      slug: row.personality.link,
      reply: row.thankYouReply,
    }),
  });
}

export async function notifyGoalReached(goalId: string) {
  const claimed = await claimReachedGoal(goalId);
  if (!claimed) {
    return;
  }
  try {
    const fiche = await ficheRecipients(claimed.personalityId);
    if (!fiche || fiche.emails.length === 0) {
      await releaseReachedClaim(goalId);
      return;
    }
    await deliver({
      to: fiche.emails,
      subject: `Objectif atteint : ${claimed.title}`,
      react: GoalReachedEmail({
        personalityName: fiche.name,
        slug: fiche.slug,
        title: claimed.title,
        percent: claimed.percent,
        target: formatFcfa(claimed.targetAmount),
      }),
    });
  } catch (error) {
    await releaseReachedClaim(goalId);
    throw error;
  }
}
