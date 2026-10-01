import { WithdrawalReview } from '@/components/admin/withdrawal-review';
import { formatFcfa } from '@/lib/money';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/server';
import Link from 'next/link';
import { adminPageMetadata } from '../access';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_LABEL = {
  pending: 'En attente',
  success: 'Versé',
  failed: 'Échoué',
  cancelled: 'Refusé',
  refunded: 'Remboursé',
} as const;

const OPERATOR_LABEL: Record<string, string> = {
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

type Withdrawal = Awaited<ReturnType<typeof api.admin.withdrawals>>[number];

function WithdrawalItem({ item }: { item: Withdrawal }) {
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/${item.personality.slug}`} className="font-medium">
          {item.personality.name}
        </Link>
        <p className="text-sm">{STATUS_LABEL[item.status]}</p>
      </div>

      <p className="mt-3 font-bold font-brand text-2xl">
        {formatFcfa(item.netAmount)}{' '}
        <span className="font-normal font-sans text-muted-foreground text-sm">
          à verser
        </span>
      </p>
      <p className="text-muted-foreground text-sm">
        Brut {formatFcfa(item.grossAmount)} · commission{' '}
        {formatFcfa(item.commissionAmount)}
      </p>

      <p className="mt-3 text-sm">
        {item.payoutPhone ? (
          <>
            {OPERATOR_LABEL[item.payoutOperator ?? ''] ?? 'Mobile Money'} ·{' '}
            <span className="font-medium tabular-nums">{item.payoutPhone}</span>
          </>
        ) : (
          <span className="text-destructive">
            Aucun numéro (demande antérieure) : contactez la personne.
          </span>
        )}
      </p>
      <p className="mt-1 text-muted-foreground text-xs">
        Demandé par {item.requestedBy?.name || item.requestedBy?.email || '—'}
        {item.requestedBy?.email ? ` (${item.requestedBy.email})` : ''} ·{' '}
        {formatDate(item.createdAt)}
      </p>

      {item.status === 'pending' ? (
        <div className="mt-4">
          <WithdrawalReview withdrawalId={item.id} />
        </div>
      ) : (
        <div className="mt-3 text-muted-foreground text-xs">
          {item.payoutReference && <p>Référence : {item.payoutReference}</p>}
          {item.reviewNote && <p>Motif : {item.reviewNote}</p>}
          {item.reviewedAt && (
            <p>
              Traité par {item.reviewedBy?.name ?? '—'} ·{' '}
              {formatDate(item.reviewedAt)}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function generateMetadata() {
  return adminPageMetadata('Retraits');
}

export default async function AdminWithdrawalsPage({
  searchParams,
}: PageProps) {
  const raw = (await searchParams).status;
  const status = raw === 'done' ? 'done' : 'pending';
  const withdrawals = await api.admin.withdrawals({ status });

  return (
    <>
      <h1 className="font-cal text-4xl">Retraits</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Versez le montant net sur le numéro indiqué, puis enregistrez la
        référence du transfert. Un refus rend le montant de nouveau disponible.
      </p>

      <nav className="mt-6 flex gap-2" aria-label="Filtrer les retraits">
        {(
          [
            ['pending', 'En attente'],
            ['done', 'Traitées'],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/withdrawals?status=${value}`}
            aria-current={status === value ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm',
              status === value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {withdrawals.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          {status === 'pending'
            ? 'Aucune demande en attente.'
            : 'Aucune demande traitée.'}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {withdrawals.map((item) => (
            <WithdrawalItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}
