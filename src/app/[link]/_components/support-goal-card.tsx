import { InlineMarkup } from '@/components/inline-markup';
import { formatFcfa } from '@/lib/money';
import type { PublicGoal } from '@/server/db/utils/support-goal';

export default function SupportGoalCard({
  goal,
  collected,
  closedAt,
}: {
  goal: PublicGoal;
  collected?: number;
  closedAt?: Date | null;
}) {
  const reached = goal.percent >= 100;
  return (
    <section className="flex flex-col gap-3 rounded-[1.25rem] border border-border/70 bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-sm">Objectif</h2>
        {closedAt ? (
          <span className="text-muted-foreground text-xs">
            Clôturé le{' '}
            {closedAt.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        ) : (
          goal.endsAt && (
            <span className="text-muted-foreground text-xs">
              Jusqu’au{' '}
              {goal.endsAt.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
              })}
            </span>
          )
        )}
      </div>
      <p className="font-bold font-brand text-lg">{goal.title}</p>
      {goal.description && (
        <p className="wrap-break-word text-muted-foreground text-sm">
          <InlineMarkup text={goal.description} />
        </p>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="aura-cta h-full rounded-full"
          style={{ width: `${goal.percent}%` }}
        />
      </div>
      <p className="text-sm">
        {reached ? 'Objectif atteint 🎉' : `${goal.percent} %`}
        <span className="text-muted-foreground">
          {' '}
          · {goal.supporters} soutien{goal.supporters > 1 ? 's' : ''} · cible{' '}
          {formatFcfa(goal.targetAmount)}
        </span>
      </p>
      {collected !== undefined && (
        <p className="text-muted-foreground text-sm">
          Collecté : {formatFcfa(collected)}
        </p>
      )}
    </section>
  );
}
