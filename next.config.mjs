await import('./src/env.mjs');

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  serverExternalPackages: ['@neondatabase/serverless', 'pg'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  redirects() {
    return Promise.resolve([
      // The directory moved to /explore. Query strings (filters) are kept.
      // Only the exact path: /personalities/new and /personalities/[slug]/* stay.
      { source: '/personalities', destination: '/explore', permanent: true },
    ]);
  },
};

export default config;
