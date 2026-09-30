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
        className="hidden text-muted-foreground text-sm transition-colors hover:text-foreground sm:inline"
      >
        Personnalités
      </Link>
      {session && (
        <Link
          href="/account/supports"
          className="hidden text-muted-foreground text-sm transition-colors hover:text-foreground sm:inline"
        >
          Mes dons
        </Link>
      )}
      {!session && (
        <Link
          href="/app/sign-in"
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          Se connecter
        </Link>
      )}
      <Link href={session ? '/app' : '/claim-link'}>
        <GradientButton size="sm">
          {session ? 'Mon espace' : 'Créer ma page'}
        </GradientButton>
      </Link>
    </NavbarShell>
  );
}
