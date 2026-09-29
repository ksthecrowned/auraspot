'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MIN_SUPPORT_AMOUNT, formatFcfa } from '@/lib/money';
import { type RouterOutputs, api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type PageData = RouterOutputs['support']['withdrawalPage'];

const STATUS_LABEL = {
  pending: 'En attente',
  success: 'Versé',
  failed: 'Échoué',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
} as const;

export default function RequestWithdrawalForm({ page }: { page: PageData }) {
  const router = useRouter();
  const requestWithdrawal = api.support.requestWithdrawal.useMutation();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed < MIN_SUPPORT_AMOUNT) {
      setError('Indiquez un montant en francs CFA.');
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        slug: page.personality.slug,
        grossAmount: parsed,
      });
      setAmount('');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'La demande n’a pas pu être envoyée.'
      );
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gross">Montant brut (FCFA)</Label>
          <Input
            id="gross"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={requestWithdrawal.isPending}>
          {requestWithdrawal.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Demander le retrait'
          )}
        </Button>
      </form>
      {page.withdrawals.length > 0 && (
        <ul className="flex flex-col gap-3">
          {page.withdrawals.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border p-4 text-sm"
            >
              <p className="font-medium">{formatFcfa(item.grossAmount)}</p>
              <p className="text-muted-foreground">
                Commission {formatFcfa(item.commissionAmount)} · net{' '}
                {formatFcfa(item.netAmount)}
              </p>
              <p className="mt-1">{STATUS_LABEL[item.status]}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
