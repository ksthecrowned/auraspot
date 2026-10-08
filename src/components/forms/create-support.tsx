'use client';

import {
  AURA_ERROR,
  AURA_INPUT,
  AURA_NOTICE,
  AURA_PRIMARY_BUTTON,
  AURA_TEXTAREA,
  SegmentedControl,
} from '@/components/forms/aura-fields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DEDICATION_MAX_LENGTH } from '@/lib/dedication';
import {
  MAX_SUPPORT_AMOUNT,
  MIN_SUPPORT_AMOUNT,
  formatFcfa,
  formatThousands,
} from '@/lib/money';
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

export default function CreateSupportForm({
  slug,
  signedIn,
  initialAmount,
  defaultDisplayName,
  firstName,
  goalTitle,
}: {
  slug: string;
  signedIn: boolean;
  initialAmount?: number;
  // Signed-in donor's name, used to prefill the name field.
  defaultDisplayName?: string;
  firstName: string;
  goalTitle?: string;
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
  const [message, setMessage] = useState('');
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
      setError(
        `Le montant doit être compris entre ${formatFcfa(MIN_SUPPORT_AMOUNT)} et ${formatFcfa(MAX_SUPPORT_AMOUNT)}.`
      );
      return;
    }
    try {
      const result = await createSupport.mutateAsync({
        slug,
        amount: parsed,
        displayName,
        isPublic,
        message,
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
      {goalTitle && (
        <p className={AURA_NOTICE}>Votre don compte pour : {goalTitle}</p>
      )}
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
              {formatThousands(preset)}
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
        <SegmentedControl
          options={INTERVALS}
          value={interval}
          onChange={setInterval}
        />
        {needsSignIn && (
          <Link
            href={`/app/sign-in?redirectUrl=${encodeURIComponent(`/support/${slug}?amount=${amount}`)}`}
            className={cn(AURA_NOTICE, 'underline-offset-4 hover:underline')}
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
          className={AURA_INPUT}
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="message">Votre message pour {firstName}</Label>
          <textarea
            id="message"
            value={message}
            maxLength={DEDICATION_MAX_LENGTH}
            disabled={!isPublic}
            placeholder="Un mot qui restera sur la fiche"
            onChange={(event) => setMessage(event.target.value)}
            className={AURA_TEXTAREA}
          />
          {isPublic ? (
            <span className="text-muted-foreground text-xs">
              {message.trim().length}/{DEDICATION_MAX_LENGTH}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              Les messages accompagnent un soutien public.
            </span>
          )}
        </div>
      </div>

      {error && <p className={AURA_ERROR}>{error}</p>}

      <button
        type="submit"
        disabled={createSupport.isPending || needsSignIn}
        className={AURA_PRIMARY_BUTTON}
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
