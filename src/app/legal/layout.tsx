import HomeFooter from '@/components/footer/home';
import SiteHeader from '@/components/site-header';
import type React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center overflow-x-clip px-4 pt-5 pb-8 md:px-8">
      <SiteHeader />

      <main className="flex w-full flex-1 flex-col pt-6 pb-20">{children}</main>

      <HomeFooter />
    </div>
  );
}
