import DedicationCard from '@/app/[link]/_components/dedication-card';
import type { DedicationItem } from '@/server/db/utils/support';
import Link from 'next/link';

export default function MessageList({
  slug,
  items,
  total,
  page,
  pageSize,
}: {
  slug: string;
  items: DedicationItem[];
  total: number;
  page: number;
  pageSize: number;
}) {
  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm">
        Aucun message pour le moment.
      </p>
    );
  }

  const hasPrevious = page > 1;
  const hasNext = page * pageSize < total;

  return (
    <div className="flex flex-col gap-5">
      {items.map((item, index) => (
        <DedicationCard
          key={item.id}
          item={item}
          index={(page - 1) * pageSize + index}
        />
      ))}
      {(hasPrevious || hasNext) && (
        <div className="flex items-center justify-between text-sm">
          {hasPrevious ? (
            <Link
              href={
                page === 2
                  ? `/${slug}/messages`
                  : `/${slug}/messages?page=${page - 1}`
              }
              className="underline-offset-4 hover:underline"
            >
              Page précédente
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link
              href={`/${slug}/messages?page=${page + 1}`}
              className="underline-offset-4 hover:underline"
            >
              Page suivante
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
