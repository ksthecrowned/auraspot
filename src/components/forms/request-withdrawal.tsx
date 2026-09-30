'use client';

import {
  AURA_ERROR,
  AURA_PRIMARY_BUTTON,
} from '@/components/forms/aura-fields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MIN_SUPPORT_AMOUNT, formatFcfa } from '@/lib/money';
import { cn } from '@/lib/utils';
import { type RouterOutputs, api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type PageData = RouterOutputs['support']['withdrawalPage'];

const STATUS = {
  pending: { label: 'En attente', tone: 'bg-muted text-muted-foreground' },
  success: {
    label: 'Versé',
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  failed: { label: 'Échoué', tone: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Annulé', tone: 'bg-muted text-muted-foreground' },
  refunded: { label: 'Remboursé', tone: 'bg-muted text-muted-foreground' },
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
        <div className="flex flex-col gap-3">
          <Label htmlFor="gross">Montant brut</Label>
          <div className="relative">
            <Input
              id="gross"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              className="h-14 rounded-2xl pr-16 font-bold font-brand text-2xl"
            />
            <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-4 font-medium text-muted-foreground text-sm">
              FCFA
            </span>
          </div>
        </div>
        {error && <p className={AURA_ERROR}>{error}</p>}
        <button
          type="submit"
          disabled={requestWithdrawal.isPending}
          className={AURA_PRIMARY_BUTTON}
        >
          {requestWithdrawal.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Demander le retrait'
          )}
        </button>
      </form>
      {page.withdrawals.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            Demandes
          </h2>
          <ul className="flex flex-col gap-2">
            {page.withdrawals.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-brand font-semibold">
                    {formatFcfa(item.grossAmount)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Commission {formatFcfa(item.commissionAmount)} · net{' '}
                    {formatFcfa(item.netAmount)}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 font-medium text-xs',
                    STATUS[item.status].tone
                  )}
                >
                  {STATUS[item.status].label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
