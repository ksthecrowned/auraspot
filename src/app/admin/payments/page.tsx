import { formatFcfa } from '@/lib/money';
import { api } from '@/trpc/server';
import Link from 'next/link';
import { adminPageMetadata } from '../access';

const STATUS_LABEL = {
  pending: 'En attente',
  success: 'Réussi',
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
  return adminPageMetadata('Paiements');
}

export default async function AdminPaymentsPage() {
  const payments = await api.admin.payments();

  return (
    <>
      <h1 className="font-cal text-4xl">Paiements</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Les montants sont visibles ici. Ils restent privés sur les fiches
        publiques.
      </p>
      {payments.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Aucun paiement.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {payments.map((item) => (
            <li key={item.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/${item.personalitySlug}`} className="font-medium">
                  {item.personalityName}
                </Link>
                <p className="text-sm">{formatFcfa(item.amount)}</p>
              </div>
              <p className="mt-1 text-muted-foreground text-sm">
                {STATUS_LABEL[item.status]} · {formatDate(item.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
