'use client';

import { NavbarShell } from '@/components/navbar/shared';
import { GradientButton } from '@/components/ui/gradient-button';
import { useSession } from '@/lib/auth-client';
import Link from 'next/link';

export default function HomeNavbar() {
  const { data: session } = useSession();

  return (
    <NavbarShell>
      <Link
        href="/explore"
        className="text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        Personnalités
      </Link>
      {session && (
        <Link
          href="/account/supports"
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          Soutiens
        </Link>
      )}
      {!session && (
        <Link
          href="/app/sign-in"
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
      )}
      <Link href={session ? '/app' : '/claim-link'}>
        <GradientButton size="sm">
          {session ? 'Go to App' : 'Get Started'}
        </GradientButton>
      </Link>
    </NavbarShell>
  );
}
