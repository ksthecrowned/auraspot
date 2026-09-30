'use client';

import {
  NAV_CTA_CLASS,
  NAV_LINK_CLASS,
  NavbarShell,
} from '@/components/navbar/shared';
import { useSession } from '@/lib/auth-client';
import Link from 'next/link';

export default function HomeNavbar() {
  const { data: session } = useSession();

  return (
    <NavbarShell
      center={
        <>
          <Link href="/explore" className={NAV_LINK_CLASS}>
            Personnalités
          </Link>
          <Link href="/#comment-ca-marche" className={NAV_LINK_CLASS}>
            Comment ça marche
          </Link>
        </>
      }
    >
      {session ? (
        <>
          <Link
            href="/account/supports"
            className={`hidden sm:inline ${NAV_LINK_CLASS}`}
          >
            Mes dons
          </Link>
          <Link href="/app" className={NAV_CTA_CLASS}>
            Mon espace
          </Link>
        </>
      ) : (
        <>
          <Link href="/app/sign-in" className={NAV_LINK_CLASS}>
            Se connecter
          </Link>
          <Link href="/claim-link" className={NAV_CTA_CLASS}>
            Créer ma page
          </Link>
        </>
      )}
    </NavbarShell>
  );
}
