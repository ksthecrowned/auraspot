import PersonalityVerificationBadge from '@/app/[link]/_components/personality-verification-badge';
import { AuraAvatar } from '@/components/aura-avatar';
import { AURA_CARD_CLASS } from '@/components/forms/aura-fields';
import { formatThousands } from '@/lib/money';
import { TAGLINE } from '@/lib/site';
import { canReceiveSupport } from '@/lib/support-eligibility';
import { cn } from '@/lib/utils';
import {
  getFeaturedPersonalities,
  listActiveCategories,
} from '@/server/db/utils/personality';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Flag,
  Heart,
  LayoutGrid,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AuraSpot — Soutenez les talents qui vous inspirent',
  description:
    'Découvrez des personnalités, suivez leurs réseaux officiels et faites-leur un don en quelques secondes, sans créer de compte.',
};

type Featured = Awaited<ReturnType<typeof getFeaturedPersonalities>>[number];

const HERO_TILT = ['rotate-3 ml-16', '-rotate-2 -mt-6', 'rotate-2 ml-24 -mt-6'];

const STEPS = [
  {
    title: 'Découvrez',
    text: 'Cherchez une personnalité par nom, catégorie ou ville.',
  },
  {
    title: 'Suivez',
    text: 'Retrouvez ses réseaux officiels, au même endroit.',
  },
  {
    title: 'Soutenez',
    text: 'Faites un don unique ou mensuel. Le montant reste privé.',
  },
];

const CREATOR_FEATURES = [
  {
    icon: BadgeCheck,
    title: 'Badge vérifié',
    text: 'Prouvez que c’est bien vous.',
  },
  { icon: Heart, title: 'Dons en FCFA', text: 'Uniques ou mensuels.' },
  { icon: Wallet, title: 'Retraits', text: 'Votre solde, quand vous voulez.' },
  {
    icon: BarChart3,
    title: 'Statistiques',
    text: 'Visites, clics, provenance.',
  },
  {
    icon: LayoutGrid,
    title: 'Page à votre image',
    text: 'Vidéos, musique, compte à rebours…',
  },
  {
    icon: Users,
    title: 'Plusieurs gestionnaires',
    text: 'Pour votre équipe ou votre agent.',
  },
];

const TRUST = [
  {
    icon: ShieldCheck,
    title: 'Badge vérifié',
    text: 'L’identité ou le mandat du représentant a été contrôlé.',
  },
  {
    icon: Lock,
    title: 'Montants privés',
    text: 'Seul le nom peut être public, jamais la somme.',
  },
  {
    icon: Flag,
    title: 'Signalement',
    text: 'Une fiche usurpée ? Signalez-la en un clic.',
  },
  {
    icon: Wallet,
    title: 'Transparent',
    text: 'Une seule commission, au moment du retrait.',
  },
];

function supportsLabel(count: number) {
  return `${formatThousands(count)} ${count === 1 ? 'soutien' : 'soutiens'}`;
}

function PersonalityCard({
  personality,
  className,
  withDonate = false,
}: {
  personality: Featured;
  className?: string;
  withDonate?: boolean;
}) {
  const details = [personality.category?.name, personality.location]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={cn(
        AURA_CARD_CLASS,
        'flex flex-col gap-3 p-4 sm:p-4',
        className
      )}
    >
      <Link href={`/${personality.slug}`} className="flex items-center gap-3">
        <AuraAvatar
          name={personality.name}
          image={personality.image}
          className="size-12 p-0.5"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="truncate font-bold font-brand">{personality.name}</p>
            {personality.verificationStatus === 'verified' && (
              <PersonalityVerificationBadge size="sm" />
            )}
          </div>
          <p className="truncate text-muted-foreground text-xs">
            {details || supportsLabel(personality.supportCount)}
          </p>
        </div>
      </Link>
      {withDonate && canReceiveSupport(personality) && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">
            {supportsLabel(personality.supportCount)}
          </span>
          <Link
            href={`/support/${personality.slug}`}
            className="aura-cta inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-brand font-semibold text-xs"
          >
            <Heart className="size-3 fill-current" />
            Faire un don
          </Link>
        </div>
      )}
    </div>
  );
}

function SearchPill() {
  return (
    <form
      method="get"
      action="/explore"
      className="flex w-full items-center gap-1 rounded-full border border-border bg-background/90 p-1.5 shadow-[0_8px_30px_-12px_rgba(180,60,240,0.35)] backdrop-blur"
    >
      <label className="flex min-w-0 flex-[3] items-center gap-2 px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">Nom</span>
        <input
          name="q"
          placeholder="Un nom, un artiste…"
          maxLength={80}
          className="h-10 w-full min-w-0 bg-transparent text-sm outline-none"
        />
      </label>
      <span className="hidden h-6 w-px shrink-0 bg-border sm:block" />
      <label className="hidden min-w-0 flex-[2] items-center gap-2 px-3 sm:flex">
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">Lieu</span>
        <input
          name="location"
          placeholder="Lieu"
          maxLength={80}
          className="h-10 w-full min-w-0 bg-transparent text-sm outline-none"
        />
      </label>
      <button
        type="submit"
        aria-label="Rechercher"
        className="aura-cta flex size-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}

function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-bold font-brand text-2xl md:text-3xl">{title}</h2>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    getFeaturedPersonalities(8),
    listActiveCategories(),
  ]);
  const heroCards = featured.slice(0, 3);

  return (
    <div className="flex w-full flex-col gap-20 overflow-x-clip md:gap-28">
      {/* Hero */}
      <section className="relative grid items-center gap-10 pt-6 md:pt-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div
          aria-hidden="true"
          className="aura-halo -z-10 -top-24 pointer-events-none absolute right-0 h-[28rem] w-full max-w-2xl"
        />
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="rounded-full border border-border bg-background/80 px-3 py-1 font-brand font-semibold text-muted-foreground text-xs">
            {TAGLINE}
          </span>
          <h1 className="mt-5 font-bold font-brand text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Soutenez les talents qui vous inspirent.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Musiciens, sportifs, créateurs : retrouvez leurs réseaux officiels
            et faites-leur un don en quelques secondes, sans créer de compte.
          </p>
          <div className="mt-7 w-full max-w-lg">
            <SearchPill />
          </div>
          {categories.length > 0 && (
            <div className="mt-3 flex max-w-lg flex-wrap justify-center gap-2 lg:justify-start">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/explore?category=${category.slug}`}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs transition-colors hover:border-foreground/30"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/explore"
              className="aura-cta inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-brand font-semibold shadow-[0_10px_30px_-10px_rgba(180,60,240,0.6)] transition-transform hover:scale-[1.03]"
            >
              Explorer les personnalités
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#personnalites"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 font-medium transition-colors hover:border-foreground/30"
            >
              Je suis une personnalité
            </Link>
          </div>
        </div>

        {heroCards.length > 0 && (
          <div className="hidden flex-col lg:flex">
            {heroCards.map((personality, index) => (
              <PersonalityCard
                key={personality.id}
                personality={personality}
                withDonate
                className={cn(
                  'w-72 shadow-[0_18px_40px_-18px_rgba(180,60,240,0.5)]',
                  HERO_TILT[index]
                )}
              />
            ))}
          </div>
        )}
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="flex flex-col gap-6">
          <SectionTitle
            title="À la une"
            subtitle="Les personnalités les plus soutenues ce mois-ci."
            action={
              <Link
                href="/explore"
                className="hidden shrink-0 items-center gap-1 font-brand font-semibold text-sm hover:underline sm:inline-flex"
              >
                Tout voir
                <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((personality) => (
              <PersonalityCard key={personality.id} personality={personality} />
            ))}
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 self-center font-brand font-semibold text-sm hover:underline sm:hidden"
          >
            Tout voir
            <ArrowRight className="size-4" />
          </Link>
        </section>
      )}

      {/* How it works */}
      <section
        id="comment-ca-marche"
        className="flex scroll-mt-24 flex-col gap-6"
      >
        <SectionTitle
          title="Comment ça marche"
          subtitle="Pas de compte, pas d’abonnement. Juste votre soutien."
        />
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className={cn(AURA_CARD_CLASS, 'flex flex-col gap-3')}
            >
              <span className="aura-ring flex size-9 items-center justify-center rounded-full font-bold font-brand text-sm text-white">
                {index + 1}
              </span>
              <h3 className="font-bold font-brand text-lg">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* For personalities */}
      <section
        id="personnalites"
        className="relative grid scroll-mt-24 gap-8 overflow-hidden rounded-[2rem] bg-[#140f1f] p-8 text-white md:p-12 lg:grid-cols-2"
      >
        <div
          aria-hidden="true"
          className="-bottom-32 -left-24 pointer-events-none absolute h-80 w-[28rem] bg-[radial-gradient(circle,rgba(247,95,192,0.35),rgba(91,108,255,0.18)_50%,transparent_70%)] blur-2xl"
        />
        <div className="relative flex flex-col items-start gap-4">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-brand font-semibold text-violet-100 text-xs">
            Pour les personnalités
          </span>
          <h2 className="font-bold font-brand text-3xl leading-tight md:text-4xl">
            Votre communauté vous soutient. Recevez-le.
          </h2>
          <p className="text-white/70">
            Créez votre page ou revendiquez celle qui existe déjà. C’est gratuit
            : AuraSpot ne prend qu’une commission au moment du retrait.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/claim-link"
              className="aura-cta inline-flex items-center justify-center rounded-full px-6 py-3 font-brand font-semibold"
            >
              Créer ma page
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 font-medium transition-colors hover:bg-white/10"
            >
              Revendiquer ma fiche
            </Link>
          </div>
        </div>
        <ul className="relative grid gap-3 sm:grid-cols-2">
          {CREATOR_FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <feature.icon className="size-4 text-pink-300" />
              <span className="mt-1 font-brand font-semibold">
                {feature.title}
              </span>
              <span className="text-sm text-white/65">{feature.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Trust */}
      <section className="flex flex-col gap-6">
        <SectionTitle
          title="En toute confiance"
          subtitle="Ce que vous voyez sur AuraSpot, et ce qui reste privé."
        />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((item) => (
            <li key={item.title} className="flex flex-col gap-2">
              <item.icon className="size-5 text-violet-500" />
              <span className="font-bold font-brand">{item.title}</span>
              <span className="text-muted-foreground text-sm">{item.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
