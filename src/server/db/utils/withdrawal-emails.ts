import WithdrawalUpdateEmail from '@/components/emails/withdrawal-update';
import { formatFcfa } from '@/lib/money';
import { SITE_URL } from '@/lib/site';
import { sendEmail } from '@/server/emails';
import { db } from '../db';

// Tells the person who asked for a withdrawal that the admin paid or
// refused it. Nothing is sent for other statuses.
export async function notifyWithdrawalReviewed(withdrawalId: string) {
  const row = await db.query.withdrawal.findFirst({
    where: (table, { eq }) => eq(table.id, withdrawalId),
    columns: {
      status: true,
      netAmount: true,
      payoutPhone: true,
      payoutReference: true,
      reviewNote: true,
    },
    with: {
      requestedBy: { columns: { email: true } },
      personality: { columns: { name: true, link: true } },
    },
  });
  if (!(row?.requestedBy?.email && row.personality)) {
    return;
  }
  if (row.status !== 'success' && row.status !== 'cancelled') {
    return;
  }
  const paid = row.status === 'success';
  await sendEmail({
    to: [row.requestedBy.email],
    subject: paid
      ? `Retrait versé pour ${row.personality.name}`
      : `Retrait refusé pour ${row.personality.name}`,
    react: WithdrawalUpdateEmail({
      kind: paid ? 'paid' : 'refused',
      personalityName: row.personality.name,
      netAmount: formatFcfa(row.netAmount),
      payoutNumber: row.payoutPhone,
      reference: row.payoutReference,
      note: row.reviewNote,
      actionUrl: `${SITE_URL}/personalities/${row.personality.link}/withdrawals`,
    }),
  });
}
