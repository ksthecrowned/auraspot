import { initialsOf } from '@/lib/personality';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Read-only avatar in the AuraSpot gradient ring (initials when no photo).
// The editable version lives in src/app/[link]/_components/avatar.tsx.
export function AuraAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'aura-ring relative size-20 shrink-0 rounded-full p-1',
        className
      )}
    >
      <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full border-4 border-background bg-[color-mix(in_oklab,var(--aura-accent,#b43cf0)_28%,#1a1325)]">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="font-bold font-brand text-white text-xl">
            {initialsOf(name)}
          </span>
        )}
      </div>
    </div>
  );
}
