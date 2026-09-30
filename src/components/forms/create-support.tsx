'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MAX_SUPPORT_AMOUNT, MIN_SUPPORT_AMOUNT } from '@/lib/money';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { Heart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

const INTERVALS = [
  { value: 'once', label: 'Une fois' },
  { value: 'month', label: 'Chaque mois' },
] as const;

const THOUSANDS_RE = /\B(?=(\d{3})+(?!\d))/g;

// Fixed format (1 000) instead of toLocaleString: same output on server
// and browser, and a plain no-break space every font can draw.
function formatAmount(value: number) {
  return String(value).replace(THOUSANDS_RE, ' ');
}

export default function CreateSupportForm({
  slug,
  signedIn,
  initialAmount,
  defaultDisplayName,
}: {
  slug: string;
  signedIn: boolean;
  initialAmount?: number;
  // Signed-in donor's name, used to prefill the name field.
  defaultDisplayName?: string;
}) {
  const router = useRouter();
  const createSupport = api.support.create.useMutation();
  const [amount, setAmount] = useState(
    initialAmount ? String(initialAmount) : '1000'
  );
  const [displayName, setDisplayName] = useState(
    defaultDisplayName?.slice(0, 80) ?? ''
  );
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

  const needsSignIn = interval === 'month' && !signedIn;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label htmlFor="amount">Montant</Label>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={cn(
                'rounded-full border px-2 py-2 font-brand font-semibold text-sm transition-colors',
                Number(amount) === preset
                  ? 'aura-cta border-transparent'
                  : 'border-border bg-background hover:border-foreground/30'
              )}
            >
              {formatAmount(preset)}
            </button>
          ))}
        </div>
        <div className="relative">
          <Input
            id="amount"
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

      <div className="flex flex-col gap-3">
        <span className="font-medium text-sm">Rythme</span>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {INTERVALS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={interval === option.value}
              onClick={() => setInterval(option.value)}
              className={cn(
                'rounded-full py-2 font-medium text-sm transition-all',
                interval === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {needsSignIn && (
          <Link
            href={`/app/sign-in?redirectUrl=${encodeURIComponent(`/support/${slug}?amount=${amount}`)}`}
            className="rounded-xl bg-muted/60 px-3 py-2 text-sm underline-offset-4 hover:underline"
          >
            Connectez-vous pour un don mensuel. Un don unique reste possible
            sans compte.
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="displayName">Votre nom, facultatif</Label>
        <Input
          id="displayName"
          value={displayName}
          maxLength={80}
          placeholder="Aïcha"
          onChange={(event) => setDisplayName(event.target.value)}
          className="h-11 rounded-xl"
        />
        <label
          htmlFor="isPublic"
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span>
            Afficher mon nom sur la fiche
            <span className="block text-muted-foreground text-xs">
              Le montant reste toujours privé.
            </span>
          </span>
          <Switch
            id="isPublic"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </label>
      </div>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={createSupport.isPending || needsSignIn}
        className="aura-cta flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-brand font-semibold text-base shadow-[0_10px_30px_-10px_rgba(180,60,240,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {createSupport.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Heart className="size-4 fill-current" />
            Continuer vers le paiement
          </>
        )}
      </button>

      {signedIn && (
        <Link
          href="/account/supports"
          className="text-center text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          Voir mon historique
        </Link>
      )}
    </form>
  );
}
