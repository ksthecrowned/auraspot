import RequestWithdrawalForm from '@/components/forms/request-withdrawal';
import { auth } from '@/lib/auth';
import { formatFcfa } from '@/lib/money';
import { api } from '@/trpc/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: 'Retraits',
  robots: { index: false, follow: false },
};

export default async function WithdrawalsPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(`/app/sign-in?redirectUrl=/personalities/${slug}/withdrawals`);
  }

  let page: Awaited<ReturnType<typeof api.support.withdrawalPage>>;
  try {
    page = await api.support.withdrawalPage({ slug });
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-12">
      <Link
        href={`/${page.personality.slug}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Retour à la fiche
      </Link>
      <h1 className="mt-4 font-cal text-4xl">Retraits</h1>
      <p className="mt-3 text-sm">
        Solde disponible : {formatFcfa(page.available)}
      </p>
      <p className="mt-1 text-muted-foreground text-sm">
        Commission actuelle : {page.commissionBps / 100} %. Demander un retrait
        ne verse pas encore l’argent.
      </p>
      <div className="mt-8">
        <RequestWithdrawalForm page={page} />
      </div>
    </div>
  );
}
