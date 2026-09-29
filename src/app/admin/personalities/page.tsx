import { PublicationToggle } from '@/components/admin/publication-toggle';
import { api } from '@/trpc/server';
import Link from 'next/link';
import { adminPageMetadata } from '../access';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CLAIM_LABEL = {
  unclaimed: 'Non revendiquée',
  claimed: 'Revendiquée',
} as const;

const STATUS_LABEL = {
  active: 'Publique',
  suspended: 'Suspendue',
} as const;

function queryValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}

export function generateMetadata() {
  return adminPageMetadata('Fiches');
}

export default async function AdminPersonalitiesPage({
  searchParams,
}: PageProps) {
  const query = queryValue((await searchParams).q);
  const personalities = await api.admin.personalities({
    query: query || undefined,
  });

  return (
    <>
      <h1 className="font-cal text-4xl">Fiches</h1>
      <form action="/admin/personalities" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Nom"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-3 text-sm"
        >
          Rechercher
        </button>
      </form>
      {personalities.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Aucune fiche.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {personalities.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div>
                <Link href={`/${item.slug}`} className="font-medium">
                  {item.name}
                </Link>
                <p className="mt-1 text-muted-foreground text-sm">
                  {STATUS_LABEL[item.status]} · {CLAIM_LABEL[item.claimStatus]}
                  {item.verificationStatus === 'verified' ? ' · Vérifiée' : ''}
                  {item.category ? ` · ${item.category.name}` : ''}
                </p>
              </div>
              <PublicationToggle personalityId={item.id} status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
