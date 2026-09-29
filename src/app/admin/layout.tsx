import Link from 'next/link';
import type { ReactNode } from 'react';
import { adminPageMetadata, requireAdmin } from './access';

const LINKS = [
  { href: '/admin', label: 'Vue d’ensemble' },
  { href: '/admin/personalities', label: 'Fiches' },
  { href: '/admin/categories', label: 'Catégories' },
  { href: '/admin/claims', label: 'Revendications' },
  { href: '/admin/payments', label: 'Paiements' },
  { href: '/admin/withdrawals', label: 'Retraits' },
  { href: '/admin/reports', label: 'Signalements' },
] as const;

export function generateMetadata() {
  return adminPageMetadata('Administration');
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <nav className="mb-8 flex flex-wrap gap-x-4 gap-y-2">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
