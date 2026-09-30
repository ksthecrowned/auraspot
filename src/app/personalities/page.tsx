import PersonalityVerificationBadge from '@/app/[link]/_components/personality-verification-badge';
import { AuraAvatar } from '@/components/aura-avatar';
import { AuraOrb, Wordmark } from '@/components/brand';
import { AURA_CARD_CLASS } from '@/components/forms/aura-fields';
import { formatThousands } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  listActiveCategories,
  searchPublicPersonalities,
} from '@/server/db/utils/personality';
import { MapPin, Plus, Search, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Personnalités',
  description:
    'Recherchez une personnalité publique par nom, catégorie ou lieu.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CATEGORY_SLUG_RE = /^[a-z0-9-]+$/;
const HTML_TAG_RE = /<[^>]*>/g;

function firstParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim().slice(0, 80);
  return trimmed || undefined;
}

function directoryHref(filters: {
  q?: string;
  category?: string;
  location?: string;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `/personalities?${query}` : '/personalities';
}

const CHIP_CLASS =
  'shrink-0 rounded-full border px-4 py-1.5 font-medium text-sm transition-colors';

export default async function PersonalitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = firstParam(params.q);
  const rawCategory = firstParam(params.category)?.toLowerCase();
  const categorySlug =
    rawCategory && CATEGORY_SLUG_RE.test(rawCategory) ? rawCategory : undefined;
  const location = firstParam(params.location);
  const hasFilters = Boolean(query || rawCategory || location);

  const categories = await listActiveCategories();
  const personalities =
    rawCategory && !categorySlug
      ? []
      : await searchPublicPersonalities({
          query,
          categorySlug,
          location,
          limit: 24,
        });

  return (
    <div className="w-full overflow-x-clip">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl animate-fade-in flex-col px-4 pt-5 pb-16 md:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Accueil AuraSpot">
            <Wordmark className="text-xl md:text-2xl" />
          </Link>
          <Link
            href="/claim-link"
            className="aura-cta inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-brand font-semibold text-sm shadow-[0_8px_24px_-10px_rgba(180,60,240,0.6)] transition-transform hover:scale-[1.03]"
          >
            <Plus className="size-4" />
            Créer une page
          </Link>
        </header>

        <section className="relative mt-14 flex flex-col items-center gap-3 text-center">
          <div
            aria-hidden="true"
            className="aura-halo -z-10 -top-24 pointer-events-none absolute inset-x-0 mx-auto h-80 max-w-2xl"
          />
          <h1 className="font-bold font-brand text-4xl leading-tight md:text-6xl">
            Personnalités
          </h1>
          <p className="max-w-md text-muted-foreground md:text-lg">
            Découvrez, suivez et soutenez les talents qui vous inspirent.
          </p>
        </section>

        <form
          method="get"
          action="/personalities"
          className="mx-auto mt-8 flex w-full max-w-2xl items-center gap-1 rounded-full border border-border bg-background/90 p-1.5 shadow-[0_8px_30px_-12px_rgba(180,60,240,0.35)] backdrop-blur"
        >
          {categorySlug && (
            <input type="hidden" name="category" value={categorySlug} />
          )}
          <label className="flex min-w-0 flex-[3] items-center gap-2 px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="sr-only">Nom</span>
            <input
              name="q"
              defaultValue={query ?? ''}
              placeholder="Un nom, un artiste…"
              maxLength={80}
              className="h-10 w-full min-w-0 bg-transparent text-sm outline-none"
            />
          </label>
          <span className="h-6 w-px shrink-0 bg-border" />
          <label className="flex min-w-0 flex-[2] items-center gap-2 px-3">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className="sr-only">Lieu</span>
            <input
              name="location"
              defaultValue={location ?? ''}
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

        <nav
          aria-label="Catégories"
          className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-auto md:flex-wrap md:justify-center md:overflow-visible"
        >
          <Link
            href={directoryHref({ q: query, location })}
            className={cn(
              CHIP_CLASS,
              categorySlug
                ? 'border-border bg-background hover:border-foreground/30'
                : 'aura-cta border-transparent'
            )}
          >
            Toutes
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={directoryHref({
                q: query,
                category: category.slug,
                location,
              })}
              className={cn(
                CHIP_CLASS,
                categorySlug === category.slug
                  ? 'aura-cta border-transparent'
                  : 'border-border bg-background hover:border-foreground/30'
              )}
            >
              {category.name}
            </Link>
          ))}
        </nav>

        {personalities.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <AuraOrb className="size-14" />
            <p className="font-brand font-semibold text-lg">
              {hasFilters
                ? 'Aucune personnalité ne correspond à cette recherche.'
                : 'Aucune personnalité pour le moment.'}
            </p>
            {hasFilters && (
              <Link
                href="/personalities"
                className="text-muted-foreground text-sm underline-offset-4 hover:underline"
              >
                Effacer les filtres
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personalities.map((personality) => {
              const bio = personality.bio?.replace(HTML_TAG_RE, '').trim();
              return (
                <li key={personality.id}>
                  <Link
                    href={`/${personality.slug}`}
                    className={cn(
                      AURA_CARD_CLASS,
                      'hover:-translate-y-1 flex h-full flex-col gap-4 transition-all hover:shadow-[0_2px_4px_rgba(11,13,26,0.05),0_18px_40px_-16px_rgba(180,60,240,0.45)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <AuraAvatar
                        name={personality.name}
                        image={personality.image}
                        className="size-14 p-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-bold font-brand text-lg">
                            {personality.name}
                          </p>
                          {personality.verificationStatus === 'verified' && (
                            <PersonalityVerificationBadge size="sm" />
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {personality.supportCount > 0
                            ? `${formatThousands(personality.supportCount)} ${personality.supportCount === 1 ? 'soutien' : 'soutiens'}`
                            : `/${personality.slug}`}
                        </p>
                      </div>
                    </div>

                    {(personality.category || personality.location) && (
                      <div className="flex flex-wrap gap-2">
                        {personality.category && (
                          <span className="aura-chip">
                            <Tag className="size-3.5" />
                            {personality.category.name}
                          </span>
                        )}
                        {personality.location && (
                          <span className="aura-chip">
                            <MapPin className="size-3.5" />
                            {personality.location}
                          </span>
                        )}
                      </div>
                    )}

                    {bio && (
                      <p className="line-clamp-2 text-muted-foreground text-sm leading-relaxed">
                        {bio}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
