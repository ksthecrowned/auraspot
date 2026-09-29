import { firstNameOf, initialsOf, supportersSummary } from '@/lib/personality';

const AVATAR_COLORS = ['#F75FC0', '#B43CF0', '#5B6CFF', '#FDBA8C', '#3FD8FF'];

export default function Community({
  name,
  supporters,
}: {
  name: string;
  supporters: { count: number; recent: { displayName: string }[] };
}) {
  const names = supporters.recent.map((item) => item.displayName);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        Communauté
      </h2>
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
