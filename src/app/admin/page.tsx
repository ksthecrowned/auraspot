import { api } from '@/trpc/server';
import Link from 'next/link';
import { adminPageMetadata } from './access';

export function generateMetadata() {
  return adminPageMetadata('Administration');
}

export default async function AdminHomePage() {
  const overview = await api.admin.overview();
  const sections = [
    {
      href: '/admin/personalities',
      label: 'Fiches',
      detail: `${overview.personalities} fiches, ${overview.suspended} suspendues`,
    },
    {
      href: '/admin/categories',
      label: 'Catégories',
      detail: `${overview.categories} catégories`,
    },
    {
      href: '/admin/claims',
      label: 'Revendications',
      detail: `${overview.openClaims} en attente`,
    },
    {
      href: '/admin/payments',
      label: 'Paiements',
      detail: `${overview.payments} paiements`,
    },
    {
      href: '/admin/withdrawals',
      label: 'Retraits',
      detail: `${overview.pendingWithdrawals} demandes en attente`,
    },
    {
      href: '/admin/reports',
      label: 'Signalements',
      detail: `${overview.openReports} ouverts`,
    },
  ];

  return (
    <>
      <h1 className="font-cal text-4xl">Administration</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Fiches, catégories, revendications, paiements, retraits et signalements.
      </p>
      <ul className="mt-8 flex flex-col gap-3">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:border-foreground"
            >
              <span className="font-medium">{section.label}</span>
              <span className="text-muted-foreground">{section.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
