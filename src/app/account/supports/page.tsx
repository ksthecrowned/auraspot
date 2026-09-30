import { AuraAvatar } from '@/components/aura-avatar';
import {
  CancelRecurringButton,
  SupportPrivacyToggle,
} from '@/components/forms/supporter-history-actions';
import PersonalityPageShell, {
  AURA_CARD_CLASS,
} from '@/components/personality-page-shell';
import { auth } from '@/lib/auth';
import { formatFcfa } from '@/lib/money';
import { api } from '@/trpc/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

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

const LINK_CLASS = 'font-medium text-sm underline-offset-4 hover:underline';

function formatDate(value: Date | null) {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
    value
  );
}

function SupportCard({
  personality,
  amount,
  meta,
  children,
}: {
  personality: { name: string; slug: string; image: string | null };
  amount: string;
  meta?: string | null;
  children: ReactNode;
}) {
  return (
    <li className={AURA_CARD_CLASS}>
      <div className="flex items-center gap-3">
        <AuraAvatar
          name={personality.name}
          image={personality.image}
          className="size-12 p-0.5"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/${personality.slug}`}
            className="block truncate font-brand font-semibold hover:underline"
          >
            {personality.name}
          </Link>
          {meta && <p className="text-muted-foreground text-xs">{meta}</p>}
        </div>
        <span className="shrink-0 font-bold font-brand">{amount}</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        {children}
      </div>
    </li>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
      {children}
    </h2>
  );
}

export default async function SupporterHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/app/sign-in?redirectUrl=/account/supports');
  }

  const history = await api.support.history();

  return (
    <PersonalityPageShell
      title="Mes soutiens"
      subtitle="Les montants ne sont visibles que par vous. Un nom public n’affiche jamais le montant."
      back={{ href: '/personalities', label: 'Personnalités' }}
      bare
    >
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <SectionTitle>Dons mensuels</SectionTitle>
          {history.recurrings.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun don mensuel en cours.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.recurrings.map((plan) => (
                <SupportCard
                  key={plan.id}
                  personality={plan.personality}
                  amount={`${formatFcfa(plan.amount)} / mois`}
                  meta={
                    formatDate(plan.nextChargeAt) &&
                    `Prochain paiement le ${formatDate(plan.nextChargeAt)}`
                  }
                >
                  {plan.checkoutPath && (
                    <Link href={plan.checkoutPath} className={LINK_CLASS}>
                      Payer le renouvellement
                    </Link>
                  )}
                  <Link
                    href={`/support/${plan.personality.slug}?amount=${plan.amount}`}
                    className={LINK_CLASS}
                  >
                    Nouveau montant
                  </Link>
                  <CancelRecurringButton recurringSupportId={plan.id} />
                </SupportCard>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Historique</SectionTitle>
          {history.supports.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Vous n’avez pas encore fait de don.{' '}
              <Link href="/personalities" className={LINK_CLASS}>
                Découvrir des personnalités
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.supports.map((item) => (
                <SupportCard
                  key={item.id}
                  personality={item.personality}
                  amount={formatFcfa(item.amount)}
                  meta={[
                    formatDate(item.createdAt),
                    item.paymentStatus && PAYMENT_STATUS[item.paymentStatus],
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                >
                  <SupportPrivacyToggle
                    supportId={item.id}
                    isPublic={item.isPublic}
                  />
                  <Link
                    href={`/support/${item.personality.slug}?amount=${item.amount}`}
                    className={LINK_CLASS}
                  >
                    Donner à nouveau
                  </Link>
                </SupportCard>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PersonalityPageShell>
  );
}
