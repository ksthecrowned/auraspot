import ClaimPersonalityForm from '@/components/forms/claim-personality';
import PersonalityPageShell from '@/components/personality-page-shell';
import { api } from '@/trpc/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Revendiquer /${slug}`,
    description:
      'Demandez à gérer une fiche publique. La demande reste en attente et ne vérifie pas la personne.',
  };
}

export default async function ClaimPersonalityPage({ params }: PageProps) {
  const { slug } = await params;
  const context = await api.personality.claimContext({ slug });
  if (!context) {
    notFound();
  }

  return (
    <PersonalityPageShell
      slug={context.personality.slug}
      title={`Revendiquer ${context.personality.name}`}
      subtitle="Dites-nous qui vous êtes et joignez des justificatifs. La demande ne vérifie pas la fiche."
    >
      <ClaimPersonalityForm context={context} />
    </PersonalityPageShell>
  );
}
