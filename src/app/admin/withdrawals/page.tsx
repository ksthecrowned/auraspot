import { formatFcfa } from '@/lib/money';
import { api } from '@/trpc/server';
import Link from 'next/link';
import { adminPageMetadata } from '../access';

const STATUS_LABEL = {
  pending: 'En attente',
  success: 'Versé',
  failed: 'Échoué',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
} as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
    value
  );
}

export function generateMetadata() {
  return adminPageMetadata('Retraits');
}

export default async function AdminWithdrawalsPage() {
  const withdrawals = await api.admin.withdrawals();

  return (
    <>
      <h1 className="font-cal text-4xl">Retraits</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Une demande n’est pas un versement. Le succès arrive quand le
        fournisseur confirme le paiement.
      </p>
      {withdrawals.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Aucune demande.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {withdrawals.map((item) => (
            <li key={item.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  href={`/${item.personality.slug}`}
                  className="font-medium"
                >
                  {item.personality.name}
                </Link>
                <p className="text-sm">{STATUS_LABEL[item.status]}</p>
              </div>
              <p className="mt-2 text-sm">
                Brut {formatFcfa(item.grossAmount)} · commission{' '}
                {formatFcfa(item.commissionAmount)} · net{' '}
                {formatFcfa(item.netAmount)}
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                {formatDate(item.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
