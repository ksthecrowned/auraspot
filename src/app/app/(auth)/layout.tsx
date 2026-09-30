import SiteHeader, { HEADER_PILL_CLASS } from '@/components/site-header';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { Suspense } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pt-5 pb-10 md:px-8">
      <SiteHeader
        actions={
          <Link href="/" className={HEADER_PILL_CLASS}>
            <ArrowLeft className="size-4" />
            Accueil
          </Link>
        }
      />

      <div className="flex w-full flex-1 flex-col items-center justify-center py-10">
        <Suspense>{children}</Suspense>
      </div>
    </div>
  );
}
