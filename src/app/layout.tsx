import '@/styles/globals.css';
import ClientProviders from '@/app/client-providers';
import {
  defaultMetadata,
  ogMetadata,
  twitterMetadata,
} from '@/app/shared-metadata';
import Background from '@/components/background';
import { TailwindIndicator } from '@/components/tailwind-indicator';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
import { Geist, Outfit } from 'next/font/google';
import LocalFont from 'next/font/local';
import type { ReactNode } from 'react';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const calSans = LocalFont({
  src: '../../public/fonts/CalSans-SemiBold.ttf',
  variable: '--font-calsans',
});
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  ...defaultMetadata,
  twitter: {
    ...twitterMetadata,
  },
  openGraph: {
    ...ogMetadata,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${calSans.variable} ${outfit.variable} font-sans`}
      >
        <Background />

        <ClientProviders>{children}</ClientProviders>

        <Toaster />
        <TailwindIndicator />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
