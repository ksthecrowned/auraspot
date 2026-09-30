import CreateSupportForm from '@/components/forms/create-support';
import PersonalityPageShell from '@/components/personality-page-shell';
import { auth } from '@/lib/auth';
import { MAX_SUPPORT_AMOUNT, MIN_SUPPORT_AMOUNT } from '@/lib/money';
import { getSupportPage } from '@/server/db/utils/support';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function initialAmount(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (
    !Number.isInteger(parsed) ||
    parsed < MIN_SUPPORT_AMOUNT ||
    parsed > MAX_SUPPORT_AMOUNT
  ) {
    return undefined;
  }
  return parsed;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const personality = await getSupportPage(slug);
  return {
    title: personality ? `Faire un don à ${personality.name}` : 'Faire un don',
    description:
      'Soutenez une personnalité sans créer de compte. Le montant n’est pas public.',
  };
}

export default async function SupportPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const personality = await getSupportPage(slug);
  if (!personality) {
    notFound();
  }
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <PersonalityPageShell
      slug={personality.slug}
      title={`Faire un don à ${personality.name}`}
      subtitle="Sans compte. Le montant reste privé."
    >
      <CreateSupportForm
        slug={personality.slug}
        signedIn={Boolean(session)}
        initialAmount={initialAmount(query.amount)}
        defaultDisplayName={session?.user.name}
      />
    </PersonalityPageShell>
  );
}
