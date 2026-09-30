'use client';

import { Wordmark } from '@/components/brand';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const HEADER_LINK_CLASS =
  'text-muted-foreground text-sm transition-colors hover:text-foreground';

export const HEADER_CTA_CLASS =
  'aura-cta inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-brand font-semibold text-sm shadow-[0_8px_24px_-10px_rgba(180,60,240,0.6)] transition-transform hover:scale-[1.03]';

export const HEADER_PILL_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground';

// Default right side: sign in / create a page, or the signed-in shortcuts.
export function AccountActions() {
  const { data: session } = useSession();

  if (session) {
    return (
      <>
        <Link
          href="/account/supports"
          className={cn('hidden sm:inline', HEADER_LINK_CLASS)}
        >
          Mes dons
        </Link>
        <Link href="/app" className={HEADER_CTA_CLASS}>
          Mon espace
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/app/sign-in" className={HEADER_LINK_CLASS}>
        Se connecter
      </Link>
      <Link href="/claim-link" className={HEADER_CTA_CLASS}>
        Créer ma page
      </Link>
    </>
  );
}

// The one header used on every page. It scrolls with the page; the right
// side changes with the context (account, back link, profile actions…).
export default function SiteHeader({
  actions,
  showNav = true,
  className,
}: {
  actions?: ReactNode;
  showNav?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex w-full items-center justify-between gap-4',
        className
      )}
    >
      <Link href="/" aria-label="Accueil AuraSpot" className="shrink-0">
        <Wordmark className="text-xl md:text-2xl" />
      </Link>
      {showNav && (
        <nav
          aria-label="Navigation principale"
          className="hidden flex-1 items-center justify-center gap-6 md:flex"
        >
          <Link href="/explore" className={HEADER_LINK_CLASS}>
            Explorer
          </Link>
          <Link href="/#comment-ca-marche" className={HEADER_LINK_CLASS}>
            Comment ça marche
          </Link>
        </nav>
      )}
      <div className="flex items-center gap-2 whitespace-nowrap sm:gap-3">
        {actions ?? <AccountActions />}
      </div>
    </header>
  );
}
