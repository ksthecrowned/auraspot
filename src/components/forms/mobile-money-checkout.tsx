'use client';

import {
  AURA_ERROR,
  AURA_PRIMARY_BUTTON,
} from '@/components/forms/aura-fields';
import { CountryFlag } from '@/components/icons/country-flag';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePaymentPolling } from '@/hooks/use-payment-polling';
import { PHONE_COUNTRIES, phoneCountry } from '@/lib/phone-countries';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import {
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  Smartphone,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useId, useState } from 'react';

type Operator = 'mtn_momo' | 'airtel_money';
type Choice = Operator | 'nyole';
type Offer = { operator: Operator; countries: string[] };

// Official logos in public/payments (trademarks of their owners). Airtel:
// Wikimedia Commons, public domain text logo. Nyole has no logo here: its
// page offers cards and mobile money, so a card icon stands for it.
const BRANDS: Record<
  Choice,
  {
    name: string;
    // Only when the name alone is not enough.
    detail?: string;
    logo: string | null;
    logoClass: string;
  }
> = {
  mtn_momo: {
    name: 'MTN MoMo',
    // App icon provided by the project (MoMo from MTN).
    logo: '/payments/momo.png',
    // The icon has a transparent margin: zoom in to fill its square.
    logoClass: 'size-7 scale-[1.2] rounded-md object-contain',
  },
  airtel_money: {
    name: 'Airtel Money',
    logo: '/payments/airtel.svg',
    logoClass: 'h-6 w-auto',
  },
  nyole: {
    name: 'Carte ou Mobile Money',
    detail: 'Visa, Mastercard · via Nyole',
    logo: null,
    logoClass: '',
  },
};

function defaultCountry(countries: string[]) {
  return countries.includes('CG') ? 'CG' : (countries[0] ?? 'CG');
}

// One payment method, laid out like Nyole's checkout: radio, name and logo
// on one row; the selected card unfolds its fields (the phone number).
function MethodCard({
  choice,
  selected,
  onSelect,
  children,
}: {
  choice: Choice;
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  const brand = BRANDS[choice];
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border-2 bg-background transition-colors',
        selected
          ? 'border-foreground'
          : 'border-border hover:border-foreground/30'
      )}
    >
      <label className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40 has-[:focus-visible]:ring-inset">
        <input
          type="radio"
          name="payment-method"
          value={choice}
          checked={selected}
          onChange={onSelect}
          className="sr-only"
        />
        <span
          className={cn(
            'grid size-[22px] shrink-0 place-content-center rounded-full border-2 transition-colors',
            selected ? 'border-foreground' : 'border-border'
          )}
        >
          {selected && <span className="size-2.5 rounded-full bg-foreground" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-[15px] leading-tight">
            {brand.name}
          </span>
          {brand.detail && (
            <span className="mt-0.5 block truncate text-muted-foreground text-xs">
              {brand.detail}
            </span>
          )}
        </span>
        <span className="grid h-9 w-14 shrink-0 place-content-center overflow-hidden rounded-lg bg-muted">
          {brand.logo ? (
            <Image
              src={brand.logo}
              alt=""
              width={28}
              height={28}
              className={brand.logoClass}
              unoptimized={brand.logo.endsWith('.svg')}
            />
          ) : (
            <CreditCard className="size-5" />
          )}
        </span>
      </label>
      {selected && children && (
        <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
      )}
    </div>
  );
}

export function PhoneField({
  label,
  countries,
  country,
  onCountryChange,
  value,
  onChange,
}: {
  label: string;
  countries: string[];
  country: string;
  onCountryChange: (iso: string) => void;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const current = phoneCountry(country);
  const options = PHONE_COUNTRIES.filter((item) =>
    countries.includes(item.iso)
  );

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block font-medium text-[12.5px] text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex h-12 items-stretch overflow-hidden rounded-xl border border-border bg-muted focus-within:ring-2 focus-within:ring-ring/40">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={options.length < 2}
            className="flex shrink-0 items-center gap-1.5 border-border border-r px-3 text-[13px] outline-none transition-colors hover:bg-foreground/5 disabled:cursor-default disabled:hover:bg-transparent"
            aria-label={`Indicatif : ${current?.name ?? ''}`}
          >
            {current && <CountryFlag iso={current.iso} />}
            <span className="font-medium tabular-nums">+{current?.dial}</span>
            {options.length > 1 && (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {options.map((item) => (
              <DropdownMenuItem
                key={item.iso}
                onSelect={() => onCountryChange(item.iso)}
                className="gap-2.5"
              >
                <CountryFlag iso={item.iso} />
                <span className="flex-1">{item.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  +{item.dial}
                </span>
                {item.iso === country && <Check className="size-3.5" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={current?.example}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3.5 font-medium text-base tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/60 md:text-sm"
          required
        />
      </div>
      <p className="mt-1.5 text-[11.5px] text-muted-foreground">
        Le numéro qui recevra la demande de paiement.
      </p>
    </div>
  );
}

// Shown while the payer approves the USSD prompt on their phone.
function AwaitingApproval() {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-muted">
        <Smartphone className="size-5" />
        <span className="absolute inset-0 animate-ping rounded-full bg-muted-foreground/10" />
      </span>
      <p className="font-medium">Validez le paiement sur votre téléphone</p>
      <p className="text-muted-foreground text-sm">
        Entrez votre code secret dans la fenêtre qui s’affiche. Cette page se
        met à jour toute seule.
      </p>
    </div>
  );
}

// Payment method choice. Direct MTN MoMo / Airtel: phone number, then wait
// while the payer approves the USSD prompt. Nyole: redirect to its page.
export default function MobileMoneyCheckout({
  paymentId,
  awaitingApproval = false,
  offers,
  nyole,
}: {
  paymentId: string;
  // true when the request was already sent (e.g. the page was reloaded).
  awaitingApproval?: boolean;
  // Operators configured on the server, with the countries they serve.
  offers: Offer[];
  // Nyole configured on the server.
  nyole: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>(
    offers[0]?.operator ?? (nyole ? 'nyole' : 'mtn_momo')
  );
  const countries =
    offers.find((offer) => offer.operator === choice)?.countries ?? [];
  const [country, setCountry] = useState(defaultCountry(countries));
  const [phone, setPhone] = useState('');
  const [waiting, setWaiting] = useState(awaitingApproval);
  const pay = api.support.pay.useMutation();
  const payWithNyole = api.support.payWithNyole.useMutation();
  const viaNyole = choice === 'nyole';
  const error = viaNyole ? payWithNyole.error : pay.error;
  // Kept busy while the browser leaves for Nyole.
  const [redirecting, setRedirecting] = useState(false);
  const busy = pay.isPending || payWithNyole.isPending || redirecting;

  usePaymentPolling(paymentId, waiting);

  if (waiting) {
    return <AwaitingApproval />;
  }

  const copy = viaNyole
    ? {
        label: 'Continuer vers Nyole',
        hint: 'Vous serez redirigé vers la page de paiement sécurisée Nyole.',
      }
    : {
        label: `Payer avec ${BRANDS[choice].name}`,
        hint: 'Vous recevrez une demande de validation sur votre téléphone.',
      };

  const choices: Choice[] = [
    ...offers.map((offer) => offer.operator),
    ...(nyole ? (['nyole'] as const) : []),
  ];

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          if (viaNyole) {
            const result = await payWithNyole
              .mutateAsync({ paymentId })
              .catch(() => null);
            // On error the payment stays open: the message shows below and
            // the payer can click again.
            if (result) {
              setRedirecting(true);
              window.location.assign(result.url);
            }
            return;
          }
          await pay.mutateAsync({
            paymentId,
            operator: choice,
            country,
            phone,
          });
          setWaiting(true);
        } catch {
          // The error is shown below. A refused request marks the payment
          // failed: refresh so the page shows it.
          router.refresh();
        }
      }}
    >
      <fieldset className="flex min-w-0 flex-col gap-2.5">
        <legend className="mb-2.5 font-medium text-[12.5px] text-muted-foreground">
          Payer avec
        </legend>
        {choices.map((item) => (
          <MethodCard
            key={item}
            choice={item}
            selected={choice === item}
            onSelect={() => {
              setChoice(item);
              const offer = offers.find((o) => o.operator === item);
              // Keep the country valid for the chosen operator.
              if (offer && !offer.countries.includes(country)) {
                setCountry(defaultCountry(offer.countries));
              }
            }}
          >
            {item !== 'nyole' && (
              <PhoneField
                label={`Numéro ${BRANDS[item].name}`}
                countries={countries}
                country={country}
                onCountryChange={setCountry}
                value={phone}
                onChange={setPhone}
              />
            )}
          </MethodCard>
        ))}
      </fieldset>

      {error && <p className={AURA_ERROR}>{error.message}</p>}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className={AURA_PRIMARY_BUTTON}
          disabled={busy || (!viaNyole && !phone)}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : copy.label}
        </button>
        <p className="text-center text-muted-foreground text-xs">{copy.hint}</p>
      </div>
    </form>
  );
}
