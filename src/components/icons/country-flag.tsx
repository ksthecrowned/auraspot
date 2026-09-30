import { cn } from '@/lib/utils';
import { CG } from 'country-flag-icons/react/3x2';

// SVG flags for the phone field (flag emojis do not render on Windows).
// Only the countries of src/lib/phone-countries.ts are bundled.
const FLAGS = { CG } as const;

export function CountryFlag({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const Flag = FLAGS[iso as keyof typeof FLAGS];
  if (!Flag) {
    return null;
  }
  return (
    <Flag
      aria-hidden="true"
      className={cn('h-3.5 w-auto shrink-0 rounded-[2px] shadow-xs', className)}
    />
  );
}
