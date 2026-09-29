import ClaimPersonalityForm from '@/components/forms/claim-personality';
import { api } from '@/trpc/server';
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
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-12">
      <Link
        href={`/${context.personality.slug}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Retour à la fiche
      </Link>
      <h1 className="mt-4 font-cal text-4xl">
        Revendiquer {context.personality.name}
      </h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Indiquez si vous êtes la personne ou son représentant, et joignez des
        justificatifs. Envoyer la demande ne reprend pas la fiche et ne la
        vérifie pas.
      </p>
      <div className="mt-8">
        <ClaimPersonalityForm context={context} />
      </div>
    </div>
  );
}
