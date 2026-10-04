import SupportGoalCard from '@/app/[link]/_components/support-goal-card';
import PersonalityPageShell from '@/components/personality-page-shell';
import { getSupportPage } from '@/server/db/utils/support';
import { listClosedGoals } from '@/server/db/utils/support-goal';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ link: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { link } = await params;
  const personality = await getSupportPage(link);
  return {
    title: personality ? `Objectifs de ${personality.name}` : 'Objectifs',
  };
}

export default async function ObjectifsPage({ params }: Props) {
  const { link } = await params;
  const personality = await getSupportPage(link);
  if (!personality) {
    notFound();
  }
  const goals = await listClosedGoals(personality.id);

  return (
    <PersonalityPageShell
      slug={personality.slug}
      title="Objectifs"
      subtitle={
        goals.length > 0
          ? `${goals.length} objectif${goals.length > 1 ? 's' : ''} terminé${goals.length > 1 ? 's' : ''}`
          : undefined
      }
      bare={goals.length > 0}
    >
      {goals.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm">
          Aucun objectif terminé.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.map((goal) => (
            <SupportGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </PersonalityPageShell>
  );
}
