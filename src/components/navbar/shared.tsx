import { Wordmark } from '@/components/brand';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function NavbarShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={cn(
          'flex h-14 w-full max-w-3xl items-center rounded-full border border-border/50 bg-background/80 px-5 shadow-sm backdrop-blur-lg',
          className
        )}
      >
        <Link href="/" className="flex items-center">
          <Wordmark className="text-2xl" />
        </Link>
        <div className="ml-auto flex items-center gap-x-3">{children}</div>
      </nav>
    </div>
  );
}
