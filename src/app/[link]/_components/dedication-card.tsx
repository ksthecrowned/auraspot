import { initialsOf } from '@/lib/personality';
import type { DedicationItem } from '@/server/db/utils/support';
import { Heart } from 'lucide-react';
import DedicationActions from './dedication-actions';

export const AVATAR_COLORS = [
  '#F75FC0',
  '#B43CF0',
  '#5B6CFF',
  '#FDBA8C',
  '#3FD8FF',
];

const UNITS = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3600],
  ['minute', 60],
] as const;

function relativeTimeFr(date: Date, now = new Date()) {
  const delta = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(delta);
  const format = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  for (const [unit, seconds] of UNITS) {
    if (abs >= seconds) {
      return format.format(Math.round(delta / seconds), unit);
    }
  }
  return format.format(delta, 'second');
}

export default function DedicationCard({
  item,
  index,
  canEdit = false,
}: {
  item: DedicationItem;
  index: number;
  canEdit?: boolean;
}) {
  return (
    <article className="flex gap-3">
      <span
        title={item.displayName}
        className="flex size-8 shrink-0 items-center justify-center rounded-full font-bold font-brand text-[11px] text-white"
        style={{
          backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
        }}
      >
        {initialsOf(item.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium text-sm">{item.displayName}</span>
          <time
            dateTime={item.createdAt.toISOString()}
            className="text-muted-foreground text-xs"
          >
            {relativeTimeFr(item.createdAt)}
          </time>
          {item.isMonthly && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              Soutien mensuel
            </span>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">
          {item.message}
        </p>
        {item.thankedAt && (
          <p className="mt-2 flex items-start gap-1.5 text-muted-foreground text-sm">
            <Heart className="mt-0.5 size-3.5 shrink-0 fill-current text-[#F75FC0]" />
            <span>{item.thankYouReply?.trim() || 'Remercié'}</span>
          </p>
        )}
        {canEdit && <DedicationActions supportId={item.id} />}
      </div>
    </article>
  );
}
