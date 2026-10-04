import {
  listClosedGoals,
  personalityIdForSlug,
} from '@/server/db/utils/support-goal';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ link: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { link } = await params;
  return { title: `Objectifs de ${link}` };
}

export default async function ObjectifsPage({ params }: Props) {
  const { link } = await params;
  const personalityId = await personalityIdForSlug(link);
  if (!personalityId) {
    notFound();
  }
  const goals = await listClosedGoals(personalityId);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col gap-6 px-4 py-10">
      <Link
        href={`/${link}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Retour à la fiche
      </Link>
      <h1 className="font-bold font-brand text-3xl">Objectifs</h1>
      {goals.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun objectif terminé.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="rounded-[1.25rem] border border-border/70 bg-card p-4"
            >
              <p className="font-semibold">{goal.title}</p>
              <p className="text-muted-foreground text-sm">
                {goal.percent} % · {goal.supporters} soutien
                {goal.supporters > 1 ? 's' : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
