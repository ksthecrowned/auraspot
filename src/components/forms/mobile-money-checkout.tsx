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
import { Label } from '@/components/ui/label';
import { PHONE_COUNTRIES, phoneCountry } from '@/lib/phone-countries';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { Check, ChevronDown, Loader2, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

type Operator = 'mtn_momo' | 'airtel_money';
type Offer = { operator: Operator; countries: string[] };

// Official logos in public/payments (trademarks of their owners). Airtel:
// Wikimedia Commons, public domain text logo.
const BRANDS: Record<
  Operator,
  { name: string; logo: string; tile: string; logoClass: string }
> = {
  mtn_momo: {
    name: 'MTN MoMo',
    // App icon provided by the project (MoMo from MTN).
    logo: '/payments/momo.png',
    tile: '',
    // The icon has a transparent margin: zoom in to fill the tile.
    logoClass: 'size-full scale-[1.2] object-contain',
  },
  airtel_money: {
    name: 'Airtel Money',
    logo: '/payments/airtel.svg',
    tile: 'bg-white ring-1 ring-black/5',
    logoClass: 'h-7 w-auto',
  },
};

const POLL_MS = 3000;

function defaultCountry(countries: string[]) {
  return countries.includes('CG') ? 'CG' : (countries[0] ?? 'CG');
}

function OperatorCard({
  operator,
  selected,
  onSelect,
}: {
  operator: Operator;
  selected: boolean;
  onSelect: () => void;
}) {
  const brand = BRANDS[operator];
  return (
    <label
      className={cn(
        'relative flex cursor-pointer items-center gap-3 rounded-2xl border bg-background p-3 text-left transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
        selected
          ? 'border-transparent shadow-[0_0_0_2px_var(--aura-accent,#f75fc0),0_8px_24px_-12px_rgba(180,60,240,0.45)]'
          : 'border-border hover:border-foreground/30'
      )}
    >
      <input
        type="radio"
        name="mobile-money-operator"
        value={operator}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl',
          brand.tile
        )}
      >
        <Image
          src={brand.logo}
          alt=""
          width={40}
          height={40}
          className={brand.logoClass}
          unoptimized={brand.logo.endsWith('.svg')}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-sm">{brand.name}</span>
        <span className="block text-muted-foreground text-xs">
          Mobile Money
        </span>
      </span>
      <span
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected
            ? 'aura-cta border-transparent text-white'
            : 'border-border text-transparent'
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </label>
  );
}

function PhoneField({
  countries,
  country,
  onCountryChange,
  value,
  onChange,
}: {
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
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>Numéro Mobile Money</Label>
      <div className="flex h-11 items-stretch overflow-hidden rounded-xl border border-input bg-background shadow-xs focus-within:ring-2 focus-within:ring-ring/40">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={options.length < 2}
            className="flex shrink-0 items-center gap-1.5 border-input border-r bg-muted/40 px-3 text-sm outline-none transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-muted/40"
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
          className="min-w-0 flex-1 bg-transparent px-3 text-base tabular-nums outline-none placeholder:text-muted-foreground/60 md:text-sm"
          required
        />
      </div>
    </div>
  );
}

// Operator choice + phone number, then waits while the payer approves the
// USSD prompt on their phone.
export default function MobileMoneyCheckout({
  paymentId,
  awaitingApproval = false,
  offers,
}: {
  paymentId: string;
  // true when the request was already sent (e.g. the page was reloaded).
  awaitingApproval?: boolean;
  // Operators configured on the server, with the countries they serve.
  offers: Offer[];
}) {
  const router = useRouter();
  const [operator, setOperator] = useState<Operator>(
    offers[0]?.operator ?? 'mtn_momo'
  );
  const countries =
    offers.find((offer) => offer.operator === operator)?.countries ?? [];
  const [country, setCountry] = useState(defaultCountry(countries));
  const [phone, setPhone] = useState('');
  const [waiting, setWaiting] = useState(awaitingApproval);
  const pay = api.support.pay.useMutation();
  const { mutateAsync: syncStatus } = api.support.syncCheckout.useMutation();

  useEffect(() => {
    if (!waiting) {
      return;
    }
    let stopped = false;
    const timer = setInterval(async () => {
      const result = await syncStatus({ paymentId }).catch(() => null);
      if (!stopped && result && result.status !== 'pending') {
        stopped = true;
        clearInterval(timer);
        router.refresh();
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [waiting, paymentId, syncStatus, router]);

  if (waiting) {
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

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await pay.mutateAsync({ paymentId, operator, country, phone });
          setWaiting(true);
        } catch {
          // The error is shown below. A refused request marks the payment
          // failed: refresh so the page shows it.
          router.refresh();
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">Moyen de paiement</span>
        <fieldset
          aria-label="Moyen de paiement"
          className={cn(
            'grid gap-2',
            offers.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {offers.map((offer) => (
            <OperatorCard
              key={offer.operator}
              operator={offer.operator}
              selected={operator === offer.operator}
              onSelect={() => {
                setOperator(offer.operator);
                // Keep the country valid for the chosen operator.
                if (!offer.countries.includes(country)) {
                  setCountry(defaultCountry(offer.countries));
                }
              }}
            />
          ))}
        </fieldset>
      </div>

      <PhoneField
        countries={countries}
        country={country}
        onCountryChange={setCountry}
        value={phone}
        onChange={setPhone}
      />

      {pay.error && <p className={AURA_ERROR}>{pay.error.message}</p>}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className={AURA_PRIMARY_BUTTON}
          disabled={pay.isPending || !phone}
        >
          {pay.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            `Payer avec ${BRANDS[operator].name}`
          )}
        </button>
        <p className="text-center text-muted-foreground text-xs">
          Vous recevrez une demande de validation sur votre téléphone.
        </p>
      </div>
    </form>
  );
}
