import ReportPersonalityForm from '@/components/forms/report-personality';
import { getPublicPersonalityBySlug } from '@/server/db/utils/personality';
import type { Metadata } from 'next';
import Link from 'next/link';
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
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-12">
      <Link
        href={`/${personality.slug}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Retour à la fiche
      </Link>
      <h1 className="mt-4 font-cal text-4xl">Signaler {personality.name}</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Un signalement n’enlève pas la fiche. La suspension est une décision
        séparée.
      </p>
      <ReportPersonalityForm slug={personality.slug} />
    </div>
  );
}
