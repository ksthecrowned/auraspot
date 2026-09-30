import { AURA_NOTICE } from '@/components/forms/aura-fields';
import ConfirmSandboxPayment from '@/components/forms/confirm-sandbox-payment';
import PersonalityPageShell from '@/components/personality-page-shell';
import { auth } from '@/lib/auth';
import { formatFcfa } from '@/lib/money';
import { cn } from '@/lib/utils';
import { getCheckout } from '@/server/db/utils/support';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ paymentId: string }>;
};

const STATUS = {
  pending: {
    copy: 'Le paiement est en attente auprès du fournisseur.',
    icon: Clock,
    tone: 'text-muted-foreground',
  },
  success: {
    copy: 'Le paiement est reçu. Merci.',
    icon: CheckCircle2,
    tone: 'text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    copy: 'Le paiement a échoué.',
    icon: XCircle,
    tone: 'text-destructive',
  },
  cancelled: {
    copy: 'Le paiement a été annulé.',
    icon: XCircle,
    tone: 'text-muted-foreground',
  },
  refunded: {
    copy: 'Le paiement a été remboursé.',
    icon: CheckCircle2,
    tone: 'text-muted-foreground',
  },
} as const;

export const metadata: Metadata = {
  title: 'Paiement',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: PageProps) {
  const { paymentId } = await params;
  const checkout = await getCheckout(paymentId);
  if (!checkout) {
    notFound();
  }
  const showSimulator =
    process.env.NODE_ENV !== 'production' && checkout.canSimulate;
  const session = await auth.api.getSession({ headers: await headers() });
  const status = STATUS[checkout.status];
  const StatusIcon = status.icon;

  return (
    <PersonalityPageShell
      slug={checkout.personalitySlug}
      title={
        checkout.status === 'success'
          ? `Merci pour ${checkout.personalityName}`
          : `Faire un don à ${checkout.personalityName}`
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-muted-foreground text-sm">Montant</span>
          <span className="font-bold font-brand text-4xl">
            {formatFcfa(checkout.amount)}
          </span>
        </div>

        <p
          className={cn(
            AURA_NOTICE,
            'flex items-center justify-center gap-2',
            status.tone
          )}
        >
          <StatusIcon className="size-4 shrink-0" />
          {status.copy}
        </p>

        {showSimulator && <ConfirmSandboxPayment paymentId={checkout.id} />}

        {session && (
          <Link
            href="/account/supports"
            className="text-center text-muted-foreground text-sm underline-offset-4 hover:underline"
          >
            Voir mon historique
          </Link>
        )}
      </div>
    </PersonalityPageShell>
  );
}
