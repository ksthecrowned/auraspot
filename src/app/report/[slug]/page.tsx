import ReportPersonalityForm from '@/components/forms/report-personality';
import PersonalityPageShell from '@/components/personality-page-shell';
import { getPublicPersonalityBySlug } from '@/server/db/utils/personality';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
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

export default async function ReportPersonalityPage({ params }: PageProps) {
  const { slug } = await params;
  const personality = await getPublicPersonalityBySlug(slug);
  if (!personality) {
    notFound();
  }

  return (
    <PersonalityPageShell
      slug={personality.slug}
      title={`Signaler ${personality.name}`}
      subtitle="Un signalement n’enlève pas la fiche. La suspension est une décision séparée."
    >
      <ReportPersonalityForm slug={personality.slug} />
    </PersonalityPageShell>
  );
}
