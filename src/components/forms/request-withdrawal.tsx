'use client';

import {
  AURA_ERROR,
  AURA_PRIMARY_BUTTON,
} from '@/components/forms/aura-fields';
import { PhoneField } from '@/components/forms/mobile-money-checkout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MAX_WITHDRAWAL_AMOUNT,
  MIN_SUPPORT_AMOUNT,
  formatFcfa,
} from '@/lib/money';
import { PHONE_COUNTRIES } from '@/lib/phone-countries';
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
  cancelled: { label: 'Refusé', tone: 'bg-muted text-muted-foreground' },
  refunded: { label: 'Remboursé', tone: 'bg-muted text-muted-foreground' },
} as const;

const OPERATORS = [
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'airtel_money', label: 'Airtel Money' },
] as const;
type Operator = (typeof OPERATORS)[number]['value'];

const OPERATOR_LABEL: Record<string, string> = {
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
};

const COUNTRY_ISOS = PHONE_COUNTRIES.map((country) => country.iso);

export default function RequestWithdrawalForm({ page }: { page: PageData }) {
  const router = useRouter();
  const requestWithdrawal = api.support.requestWithdrawal.useMutation();
  const [amount, setAmount] = useState('');
  // The last number used is offered again.
  const [operator, setOperator] = useState<Operator>(
    page.lastPayout?.operator ?? 'mtn_momo'
  );
  const [country, setCountry] = useState(page.lastPayout?.iso ?? 'CG');
  const [phone, setPhone] = useState(page.lastPayout?.national ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed < MIN_SUPPORT_AMOUNT) {
      setError('Indiquez un montant en francs CFA.');
      return;
    }
    if (parsed > MAX_WITHDRAWAL_AMOUNT) {
      setError(
        `Un retrait ne peut pas dépasser ${formatFcfa(MAX_WITHDRAWAL_AMOUNT)} pendant la bêta.`
      );
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        slug: page.personality.slug,
        grossAmount: parsed,
        payoutOperator: operator,
        payoutCountry: country,
        payoutPhone: phone,
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
        <div className="flex flex-col gap-3">
          <span className="font-medium text-sm">Recevoir sur</span>
          <div className="grid grid-cols-2 gap-2">
            {OPERATORS.map((item) => (
              <label
                key={item.value}
                className={cn(
                  'flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 py-2.5 font-medium text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
                  operator === item.value
                    ? 'border-foreground'
                    : 'border-border hover:border-foreground/30'
                )}
              >
                <input
                  type="radio"
                  name="payout-operator"
                  value={item.value}
                  checked={operator === item.value}
                  onChange={() => setOperator(item.value)}
                  className="sr-only"
                />
                {item.label}
              </label>
            ))}
          </div>
          <PhoneField
            label={`Numéro ${OPERATOR_LABEL[operator]}`}
            hint="Le numéro qui recevra l’argent. Il doit être à votre nom."
            countries={COUNTRY_ISOS}
            country={country}
            onCountryChange={setCountry}
            value={phone}
            onChange={setPhone}
          />
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
                    {item.payoutPhone
                      ? ` · ${OPERATOR_LABEL[item.payoutOperator ?? ''] ?? ''} ${item.payoutPhone}`
                      : ''}
                  </p>
                  {item.payoutReference && (
                    <p className="text-muted-foreground text-xs">
                      Référence : {item.payoutReference}
                    </p>
                  )}
                  {item.reviewNote && (
                    <p className="text-muted-foreground text-xs">
                      Motif : {item.reviewNote}
                    </p>
                  )}
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
