import { firstNameOf, initialsOf, supportersSummary } from '@/lib/personality';
import type { DedicationItem } from '@/server/db/utils/support';
import Link from 'next/link';
import DedicationCard, { AVATAR_COLORS } from './dedication-card';

export default function Community({
  name,
  slug,
  supporters,
  dedications,
  canEdit = false,
}: {
  name: string;
  slug: string;
  supporters: { count: number; recent: { displayName: string }[] };
  dedications: { items: DedicationItem[]; total: number };
  canEdit?: boolean;
}) {
  const names = supporters.recent.map((item) => item.displayName);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        Communauté
      </h2>
      {dedications.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {dedications.items.map((item, index) => (
            <DedicationCard
              key={item.id}
              item={item}
              index={index}
              slug={slug}
              canEdit={canEdit}
            />
          ))}
          {dedications.total > 3 && (
            <Link
              href={`/${slug}/messages`}
              className="text-sm underline-offset-4 hover:underline"
            >
              Voir les {dedications.total} messages
            </Link>
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        {names.length > 0 && (
          <div className="-space-x-2 flex">
            {names.map((displayName, index) => (
              <span
                key={displayName}
                title={displayName}
                className="flex size-8 items-center justify-center rounded-full border-2 border-background font-bold font-brand text-[11px] text-white"
                style={{
                  backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                }}
              >
                {initialsOf(displayName)}
              </span>
            ))}
          </div>
        )}
        <p className="text-foreground/80 text-sm">
          {supportersSummary({
            names,
            count: supporters.count,
            firstName: firstNameOf(name),
          })}
        </p>
      </div>
    </section>
  );
}
