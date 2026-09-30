import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';
import { EmptyState } from '@/components/dashboard/empty-state';
import { DashboardLinkCard } from '@/components/dashboard/link-card';
import { AURA_CARD_CLASS } from '@/components/personality-page-shell';
import { Skeleton } from '@/components/ui/skeleton';
import UserSettings from '@/components/user-settings';
import { formatThousands } from '@/lib/money';
import { firstNameOf } from '@/lib/personality';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/server';
import { Eye, Heart, LayoutGrid, Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
}) {
  return (
    <div className={cn(AURA_CARD_CLASS, 'flex flex-col gap-1 p-4 sm:p-5')}>
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="font-bold font-brand text-2xl sm:text-3xl">
        {formatThousands(value)}
      </span>
    </div>
  );
}

export default async function Page() {
  const user = await api.user.me();

  if (!user) {
    redirect('/app/sign-in');
  }

  const links = await api.profileLink.getAll();
  const totalSupports = links.reduce((sum, link) => sum + link.supportCount, 0);
  const totalViews = links.reduce((sum, link) => sum + link.monthlyViews, 0);

  return (
    <div className="flex w-full animate-fade-in flex-col gap-8">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div
          aria-hidden="true"
          className="aura-halo -z-10 -left-16 -top-24 pointer-events-none absolute h-64 w-[28rem]"
        />
        <div>
          <h1 className="font-bold font-brand text-3xl leading-tight sm:text-4xl">
            Bonjour {firstNameOf(user.name)}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Vos fiches et vos dons en un coup d’œil.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/account/supports"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 font-medium text-sm transition-colors hover:border-foreground/30"
          >
            <Heart className="size-4" />
            Mes dons
          </Link>
          <Link
            href="/claim-link"
            className="aura-cta inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-brand font-semibold text-sm shadow-[0_8px_24px_-10px_rgba(180,60,240,0.6)] transition-transform hover:scale-[1.03]"
          >
            <Plus className="size-4" />
            Créer une page
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile icon={LayoutGrid} label="Fiches" value={links.length} />
        <StatTile icon={Heart} label="Soutiens reçus" value={totalSupports} />
        <StatTile icon={Eye} label="Visites 30 j" value={totalViews} />
      </div>

      <DashboardTabs
        pages={
          links.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {links.map((link) => (
                <DashboardLinkCard key={link.id} link={link} />
              ))}
            </div>
          )
        }
        settings={
          <Suspense
            fallback={
              <div className={cn(AURA_CARD_CLASS, 'flex flex-col gap-6')}>
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            }
          >
            <UserSettings user={user} />
          </Suspense>
        }
      />
    </div>
  );
}
