import HomeFooter from '@/components/footer/home';
import HomeNavbar from '@/components/navbar/home';
import type React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-4 pt-24 pb-8 md:px-8">
      <HomeNavbar />

      <main className="flex w-full flex-1 flex-col pb-20">{children}</main>

      <HomeFooter />
    </div>
  );
}
