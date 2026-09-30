'use client';

import { UserMenu } from '@/components/dashboard/user-menu';
import { NAV_LINK_CLASS, NavbarShell } from '@/components/navbar/shared';
import Link from 'next/link';

export default function AppNavbar() {
  return (
    <NavbarShell
      center={
        <>
          <Link href="/app" className={NAV_LINK_CLASS}>
            Mes fiches
          </Link>
          <Link href="/explore" className={NAV_LINK_CLASS}>
            Personnalités
          </Link>
        </>
      }
    >
      <UserMenu />
    </NavbarShell>
  );
}
