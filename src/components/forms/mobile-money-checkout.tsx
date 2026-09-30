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
    subtitle: string;
    logo: string | null;
    tile: string;
    logoClass: string;
  }
> = {
  mtn_momo: {
    name: 'MTN MoMo',
    subtitle: 'Mobile Money',
    // App icon provided by the project (MoMo from MTN).
    logo: '/payments/momo.png',
    tile: '',
    // The icon has a transparent margin: zoom in to fill the tile.
    logoClass: 'size-full scale-[1.2] object-contain',
  },
  airtel_money: {
    name: 'Airtel Money',
    subtitle: 'Mobile Money',
    logo: '/payments/airtel.svg',
    tile: 'bg-white ring-1 ring-black/5',
    logoClass: 'h-7 w-auto',
  },
  nyole: {
    name: 'Carte ou Mobile Money',
    subtitle: 'Visa, Mastercard, MTN, Airtel · via Nyole',
    logo: null,
    tile: 'bg-muted',
    logoClass: '',
  },
};

function defaultCountry(countries: string[]) {
  return countries.includes('CG') ? 'CG' : (countries[0] ?? 'CG');
}

function OperatorCard({
  operator,
  selected,
  onSelect,
}: {
  operator: Choice;
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
        {brand.logo ? (
          <Image
            src={brand.logo}
            alt=""
            width={40}
            height={40}
            className={brand.logoClass}
            unoptimized={brand.logo.endsWith('.svg')}
          />
        ) : (
          <CreditCard className="size-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-sm">{brand.name}</span>
        <span className="block text-muted-foreground text-xs">
          {brand.subtitle}
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
            const { url } = await payWithNyole.mutateAsync({ paymentId });
            setRedirecting(true);
            window.location.assign(url);
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
      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">Moyen de paiement</span>
        <fieldset
          aria-label="Moyen de paiement"
          className={cn(
            'grid gap-2',
            choices.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {choices.map((item) => (
            <OperatorCard
              key={item}
              operator={item}
              selected={choice === item}
              onSelect={() => {
                setChoice(item);
                const offer = offers.find((o) => o.operator === item);
                // Keep the country valid for the chosen operator.
                if (offer && !offer.countries.includes(country)) {
                  setCountry(defaultCountry(offer.countries));
                }
              }}
            />
          ))}
        </fieldset>
      </div>

      {!viaNyole && (
        <PhoneField
          countries={countries}
          country={country}
          onCountryChange={setCountry}
          value={phone}
          onChange={setPhone}
        />
      )}

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
