import {
  defaultMetadata,
  ogMetadata,
  twitterMetadata,
} from '@/app/shared-metadata';
import HomeFooter from '@/components/footer/home';
import SiteHeader from '@/components/site-header';
import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  ...defaultMetadata,
  title: 'Legal - AuraSpot',
  twitter: {
    ...twitterMetadata,
    title: 'Legal - AuraSpot',
  },
  openGraph: {
    ...ogMetadata,
    title: 'Legal - AuraSpot',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center gap-y-8 px-4 pt-5 pb-8 md:px-8">
      <SiteHeader />

      <div className="w-full max-w-3xl rounded-lg border border-border bg-background px-3 py-4 md:px-6 md:py-8">
        <article className="prose dark:prose-invert prose-headings:font-cal prose-p:text-sm">
          {children}
        </article>
      </div>

      <HomeFooter />
    </section>
  );
}
