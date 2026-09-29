import ConfirmSandboxPayment from '@/components/forms/confirm-sandbox-payment';
import { auth } from '@/lib/auth';
import { formatFcfa } from '@/lib/money';
import { getCheckout } from '@/server/db/utils/support';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ paymentId: string }>;
};

const STATUS_COPY = {
  pending: 'Le paiement est en attente auprès du fournisseur.',
  success: 'Le paiement est reçu. Merci.',
  failed: 'Le paiement a échoué.',
  cancelled: 'Le paiement a été annulé.',
  refunded: 'Le paiement a été remboursé.',
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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-12">
      <h1 className="font-cal text-4xl">
        Soutien à {checkout.personalityName}
      </h1>
      <p className="mt-4 font-medium text-2xl">{formatFcfa(checkout.amount)}</p>
      <p className="mt-3 text-muted-foreground text-sm">
        {STATUS_COPY[checkout.status]}
      </p>
      {showSimulator && (
        <div className="mt-8">
          <ConfirmSandboxPayment paymentId={checkout.id} />
        </div>
      )}
      <div className="mt-8 flex flex-col gap-3">
        {session && (
          <Link
            href="/account/supports"
            className="text-sm underline-offset-4 hover:underline"
          >
            Voir mon historique
          </Link>
        )}
        <Link
          href={`/${checkout.personalitySlug}`}
          className="text-sm underline-offset-4 hover:underline"
        >
          Retour à la fiche
        </Link>
      </div>
    </div>
  );
}
