import { Wordmark } from '@/components/brand';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const NAV_LINK_CLASS =
  'text-muted-foreground text-sm transition-colors hover:text-foreground';

export const NAV_CTA_CLASS =
  'aura-cta inline-flex items-center rounded-full px-4 py-2 font-brand font-semibold text-sm shadow-[0_8px_20px_-10px_rgba(180,60,240,0.7)] transition-transform hover:scale-[1.03]';

export function NavbarShell({
  children,
  center,
  className,
}: {
  children: ReactNode;
  // Links shown in the middle on larger screens.
  center?: ReactNode;
  className?: string;
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={cn(
          'flex h-14 w-full max-w-5xl items-center gap-4 rounded-full border border-border/60 bg-background/75 px-4 shadow-[0_8px_30px_-16px_rgba(180,60,240,0.45)] backdrop-blur-xl sm:px-5',
          className
        )}
      >
        <Link href="/" className="flex shrink-0 items-center">
          <Wordmark className="text-xl sm:text-2xl" />
        </Link>
        {center && (
          <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
            {center}
          </div>
        )}
        <div className="ml-auto flex items-center gap-x-3 whitespace-nowrap">
          {children}
        </div>
      </nav>
    </div>
  );
}
