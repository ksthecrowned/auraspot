import SupportGoalCard from '@/app/[link]/_components/support-goal-card';
import PersonalityPageShell from '@/components/personality-page-shell';
import { auth } from '@/lib/auth';
import { db } from '@/server/db/db';
import { isProfileLinkEditor } from '@/server/db/utils/link';
import { listClosedGoals } from '@/server/db/utils/support-goal';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

type Props = { params: Promise<{ link: string }> };

export const metadata: Metadata = {
  title: 'Historique des objectifs',
  robots: { index: false, follow: false },
};

export default async function ObjectifsPage({ params }: Props) {
  const { link } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(`/app/sign-in?redirectUrl=/${link}/objectifs`);
  }

  const profile = await db.query.link.findFirst({
    where: (table, { eq: equals }) => equals(table.link, link),
    columns: { id: true, userId: true, link: true },
  });
  if (!profile) {
    notFound();
  }

  const canEdit = await isProfileLinkEditor(session.user.id, {
    id: profile.id,
    userId: profile.userId ?? '',
  });
  if (!canEdit) {
    notFound();
  }

  const goals = await listClosedGoals(profile.id);

  return (
    <PersonalityPageShell
      slug={profile.link}
      title="Historique des objectifs"
      subtitle={
        goals.length > 0
          ? `${goals.length} objectif${goals.length > 1 ? 's' : ''} terminé${goals.length > 1 ? 's' : ''}`
          : undefined
      }
      back={{ href: '/app', label: 'Tableau de bord' }}
      bare={goals.length > 0}
    >
      {goals.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm">
          Aucun objectif terminé.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.map((goal) => (
            <SupportGoalCard
              key={goal.id}
              goal={goal}
              collected={goal.collected}
              closedAt={goal.closedAt}
            />
          ))}
        </div>
      )}
    </PersonalityPageShell>
  );
}
