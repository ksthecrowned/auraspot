import { cn } from '@/lib/utils';

// Shared look for the forms around a personality profile.

export const AURA_PRIMARY_BUTTON =
  'aura-cta flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-brand font-semibold text-base shadow-[0_10px_30px_-10px_rgba(180,60,240,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

export const AURA_SECONDARY_BUTTON =
  'flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 font-medium text-sm transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-50';

export const AURA_INPUT = 'h-11 rounded-xl';

export const AURA_TEXTAREA =
  'min-h-32 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

export const AURA_NOTICE = 'rounded-xl bg-muted/60 px-3 py-2.5 text-sm';

export const AURA_ERROR =
  'rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-sm';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="grid gap-1 rounded-full bg-muted p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-2 py-2 font-medium text-sm transition-all',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
