import RequestWithdrawalForm from '@/components/forms/request-withdrawal';
import PersonalityPageShell from '@/components/personality-page-shell';
import { auth } from '@/lib/auth';
import { formatFcfa } from '@/lib/money';
import { api } from '@/trpc/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
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
    <PersonalityPageShell
      slug={page.personality.slug}
      title="Retraits"
      subtitle={`Commission : ${page.commissionBps / 100} %. Une demande ne verse pas encore l’argent.`}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-muted-foreground text-sm">
            Solde disponible
          </span>
          <span className="font-bold font-brand text-4xl">
            {formatFcfa(page.available)}
          </span>
        </div>
        <RequestWithdrawalForm page={page} />
      </div>
    </PersonalityPageShell>
  );
}
