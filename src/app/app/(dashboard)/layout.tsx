import { UserMenu } from '@/components/dashboard/user-menu';
import SiteHeader, { HEADER_LINK_CLASS } from '@/components/site-header';
import Link from 'next/link';
import type React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-4 pt-5 pb-20 md:px-8">
      <SiteHeader
        actions={
          <>
            <Link href="/app" className={HEADER_LINK_CLASS}>
              Mes fiches
            </Link>
            <UserMenu />
          </>
        }
      />

      <div className="flex w-full max-w-3xl flex-col pt-10">{children}</div>
    </div>
  );
}
