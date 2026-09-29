import CreateSupportForm from '@/components/forms/create-support';
import { auth } from '@/lib/auth';
import { MAX_SUPPORT_AMOUNT, MIN_SUPPORT_AMOUNT } from '@/lib/money';
import { getSupportPage } from '@/server/db/utils/support';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
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
    title: personality ? `Soutenir ${personality.name}` : 'Soutenir',
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
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-12">
      <Link
        href={`/${personality.slug}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Retour à la fiche
      </Link>
      <h1 className="mt-4 font-cal text-4xl">Soutenir {personality.name}</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Aucun compte n’est nécessaire. Le montant n’apparaît pas sur la fiche.
      </p>
      <div className="mt-8">
        <CreateSupportForm
          slug={personality.slug}
          signedIn={Boolean(session)}
          initialAmount={initialAmount(query.amount)}
        />
      </div>
    </div>
  );
}
