import {
  CancelRecurringButton,
  SupportPrivacyToggle,
} from '@/components/forms/supporter-history-actions';
import { auth } from '@/lib/auth';
import { formatFcfa } from '@/lib/money';
import { api } from '@/trpc/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Mes soutiens',
  robots: { index: false, follow: false },
};

const PAYMENT_STATUS = {
  pending: 'En attente',
  success: 'Réussi',
  failed: 'Échoué',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
} as const;

function formatDate(value: Date | null) {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
    value
  );
}

export default async function SupporterHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/app/sign-in?redirectUrl=/account/supports');
  }

  const history = await api.support.history();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-12">
      <h1 className="font-cal text-4xl">Mes soutiens</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Les montants ne sont visibles que pour vous. Un nom public n’affiche
        jamais le montant.
      </p>

      <section className="mt-10">
        <h2 className="font-medium text-lg">Renouvellements</h2>
        {history.recurrings.length === 0 ? (
          <p className="mt-3 text-muted-foreground text-sm">
            Aucun soutien mensuel en cours.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {history.recurrings.map((plan) => (
              <li
                key={plan.id}
                className="rounded-2xl border border-border p-4"
              >
                <p className="font-medium">{plan.personality.name}</p>
                <p className="mt-1 text-sm">{formatFcfa(plan.amount)} / mois</p>
                {formatDate(plan.nextChargeAt) && (
                  <p className="mt-1 text-muted-foreground text-sm">
                    Prochain paiement le {formatDate(plan.nextChargeAt)}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  {plan.checkoutPath && (
                    <Link
                      href={plan.checkoutPath}
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      Payer le renouvellement
                    </Link>
                  )}
                  <Link
                    href={`/support/${plan.personality.slug}?amount=${plan.amount}`}
                    className="text-sm underline-offset-4 hover:underline"
                  >
                    Nouveau montant
                  </Link>
                </div>
                <div className="mt-3">
                  <CancelRecurringButton recurringSupportId={plan.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-medium text-lg">Historique</h2>
        {history.supports.length === 0 ? (
          <p className="mt-3 text-muted-foreground text-sm">
            Vous n’avez pas encore soutenu de personnalité.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {history.supports.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-border p-4"
              >
                <p className="font-medium">{item.personality.name}</p>
                <p className="mt-1 text-sm">{formatFcfa(item.amount)}</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {formatDate(item.createdAt)}
                  {item.paymentStatus
                    ? ` · ${PAYMENT_STATUS[item.paymentStatus]}`
                    : ''}
                </p>
                <div className="mt-3">
                  <SupportPrivacyToggle
                    supportId={item.id}
                    isPublic={item.isPublic}
                  />
                </div>
                <Link
                  href={`/support/${item.personality.slug}?amount=${item.amount}`}
                  className="mt-3 inline-block text-sm underline-offset-4 hover:underline"
                >
                  Renouveler
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
