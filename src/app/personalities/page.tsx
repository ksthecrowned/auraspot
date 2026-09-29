import PersonalityVerificationBadge from '@/app/[link]/_components/personality-verification-badge';
import { api } from '@/trpc/server';
import { Users } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Personnalités',
  description:
    'Recherchez une personnalité publique par nom, catégorie ou lieu.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CATEGORY_SLUG_RE = /^[a-z0-9-]+$/;

function emptyMessage(hasFilters: boolean) {
  if (hasFilters) {
    return 'Aucune personnalité ne correspond à cette recherche.';
  }
  return 'Aucune personnalité pour le moment.';
}

function firstParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim().slice(0, 80);
  return trimmed || undefined;
}

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

  const categories = await api.personality.categories();
  const personalities =
    rawCategory && !categorySlug
      ? []
      : await api.personality.search({
          query,
          categorySlug,
          location,
          limit: 24,
        });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <h1 className="font-cal text-4xl md:text-5xl">Personnalités</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Recherchez une page publique par nom, catégorie ou lieu. Les plus
            récentes apparaissent en premier.
          </p>
        </div>
        <Link
          href="/claim-link"
          className="inline-flex w-fit items-center rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
        >
          Créer une page
        </Link>
      </div>

      <form
        method="get"
        className="mb-10 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          Nom
          <input
            name="q"
            defaultValue={query ?? ''}
            placeholder="Artiste X"
            maxLength={80}
            className="h-9 rounded-md border border-input bg-transparent px-3 shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Catégorie
          <select
            name="category"
            defaultValue={categorySlug ?? ''}
            className="h-9 rounded-md border border-input bg-transparent px-3 shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Lieu
          <input
            name="location"
            defaultValue={location ?? ''}
            placeholder="Brazzaville"
            maxLength={80}
            className="h-9 rounded-md border border-input bg-transparent px-3 shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm"
          >
            Rechercher
          </button>
          {hasFilters && (
            <Link
              href="/personalities"
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              Effacer
            </Link>
          )}
        </div>
      </form>

      {personalities.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-lg">{emptyMessage(hasFilters)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personalities.map((personality) => {
            const details = [
              personality.category?.name,
              personality.location,
            ].filter(Boolean);

            return (
              <Link
                key={personality.id}
                href={`/${personality.slug}`}
                className="group flex items-start gap-4 rounded-xl border border-border p-4 transition-all hover:border-primary hover:shadow-sm"
              >
                {personality.image ? (
                  <Image
                    src={personality.image}
                    alt={personality.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted font-cal">
                    {personality.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-cal text-base">
                      {personality.name}
                    </p>
                    {personality.verificationStatus === 'verified' && (
                      <PersonalityVerificationBadge size="sm" />
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    /{personality.slug}
                  </p>
                  {details.length > 0 && (
                    <p className="mt-1 text-muted-foreground text-xs">
                      {details.join(' · ')}
                    </p>
                  )}
                  {personality.bio && (
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                      {personality.bio.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
