'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_SUPPORT_AMOUNT, MIN_SUPPORT_AMOUNT } from '@/lib/money';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export default function CreateSupportForm({
  slug,
  signedIn,
  initialAmount,
}: {
  slug: string;
  signedIn: boolean;
  initialAmount?: number;
}) {
  const router = useRouter();
  const createSupport = api.support.create.useMutation();
  const [amount, setAmount] = useState(
    initialAmount ? String(initialAmount) : '1000'
  );
  const [displayName, setDisplayName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [interval, setInterval] = useState<'once' | 'month'>('once');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (
      !Number.isInteger(parsed) ||
      parsed < MIN_SUPPORT_AMOUNT ||
      parsed > MAX_SUPPORT_AMOUNT
    ) {
      setError('Indiquez un montant en francs CFA, entre 100 et 2 000 000.');
      return;
    }
    try {
      const result = await createSupport.mutateAsync({
        slug,
        amount: parsed,
        displayName,
        isPublic,
        interval,
      });
      router.push(result.checkoutPath);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Le paiement n’a pas pu être préparé.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Montant (FCFA)</Label>
        <Input
          id="amount"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Nom affiché, facultatif</Label>
        <Input
          id="displayName"
          value={displayName}
          maxLength={80}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-sm">Rythme</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="interval"
            checked={interval === 'once'}
            onChange={() => setInterval('once')}
          />
          Une fois
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="interval"
            checked={interval === 'month'}
            onChange={() => setInterval('month')}
          />
          Chaque mois
        </label>
      </fieldset>
      {interval === 'month' && !signedIn && (
        <Link
          href={`/app/sign-in?redirectUrl=${encodeURIComponent(`/support/${slug}?amount=${amount}`)}`}
          className="text-sm underline-offset-4 hover:underline"
        >
          Connectez-vous pour un soutien mensuel. Un paiement unique reste
          possible sans compte.
        </Link>
      )}
      {signedIn && (
        <Link
          href="/account/supports"
          className="text-sm underline-offset-4 hover:underline"
        >
          Voir mon historique
        </Link>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
        />
        Afficher mon nom. Le montant reste privé.
      </label>
      {error && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={
          createSupport.isPending || (interval === 'month' && !signedIn)
        }
      >
        {createSupport.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Continuer'
        )}
      </Button>
    </form>
  );
}
