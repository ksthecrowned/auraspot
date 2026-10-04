import ReportPersonalityForm from '@/components/forms/report-personality';
import PersonalityPageShell from '@/components/personality-page-shell';
import { getPublicPersonalityBySlug } from '@/server/db/utils/personality';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const personality = await getPublicPersonalityBySlug(slug);
  return {
    title: personality ? `Signaler ${personality.name}` : 'Signaler',
    robots: { index: false, follow: false },
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportPersonalityPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const personality = await getPublicPersonalityBySlug(slug);
  if (!personality) {
    notFound();
  }
  const supportId = firstParam(query.supportId);

  return (
    <PersonalityPageShell
      slug={personality.slug}
      title={`Signaler ${personality.name}`}
      subtitle="Un signalement n’enlève pas la fiche. La suspension est une décision séparée."
    >
      <ReportPersonalityForm
        slug={personality.slug}
        supportId={supportId || undefined}
      />
    </PersonalityPageShell>
  );
}
