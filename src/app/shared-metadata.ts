import { SITE_NAME, SITE_URL, TAGLINE } from '@/lib/site';

export const TITLE = SITE_NAME;
export const DESCRIPTION = TAGLINE;

export const defaultMetadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const twitterMetadata = {
  title: TITLE,
  description: DESCRIPTION,
  card: 'summary_large_image',
  images: ['/api/og'],
};

export const ogMetadata = {
  title: TITLE,
  description: DESCRIPTION,
  type: 'website',
  images: ['/api/og'],
};
