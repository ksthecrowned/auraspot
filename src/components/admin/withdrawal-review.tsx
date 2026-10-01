'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

// Pay the net amount by MoMo/Airtel, then record it here with the transfer
// reference; or refuse with a reason. Either way the person gets an email.
export function WithdrawalReview({ withdrawalId }: { withdrawalId: string }) {
  const router = useRouter();
  const review = api.admin.reviewWithdrawal.useMutation();
  const [mode, setMode] = useState<'paid' | 'refused' | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!mode) {
      return;
    }
    setError(null);
    try {
      await review.mutateAsync({
        withdrawalId,
        decision: mode,
        ...(mode === 'paid' ? { reference: value } : { note: value }),
      });
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'La demande n’a pas pu être traitée.'
      );
    }
  };

  if (!mode) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setMode('paid')}>
          Marquer versé
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setMode('refused')}
        >
          Refuser
        </Button>
      </div>
    );
  }

  const paid = mode === 'paid';
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={`review-${withdrawalId}`} className="font-medium text-sm">
        {paid ? 'Référence du transfert MoMo / Airtel' : 'Motif du refus'}
      </label>
      <Input
        id={`review-${withdrawalId}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
        minLength={paid ? 3 : 5}
        maxLength={paid ? 120 : 500}
        placeholder={
          paid ? 'Ex. MP240930.1234.A56789' : 'Ex. numéro au nom d’un tiers'
        }
        autoFocus
      />
      <p className="text-muted-foreground text-xs">
        {paid
          ? 'Faites le transfert d’abord. La personne reçoit un e-mail avec cette référence.'
          : 'Le montant redevient disponible. La personne reçoit un e-mail avec ce motif.'}
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={review.isPending}
          variant={paid ? 'default' : 'destructive'}
        >
          {review.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span>
              {paid ? 'Confirmer le versement' : 'Confirmer le refus'}
            </span>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setMode(null);
            setValue('');
            setError(null);
          }}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
