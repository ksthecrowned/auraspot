import PersonalityVerificationBadge from '@/app/[link]/_components/personality-verification-badge';
import { AuraAvatar } from '@/components/aura-avatar';
import Analytics from '@/components/dashboard/analytics';
import { AURA_CARD_CLASS } from '@/components/forms/aura-fields';
import { ROOT_DOMAIN } from '@/lib/site';
import { cn } from '@/lib/utils';
import { getProfileLinkById } from '@/server/db';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Statistiques',
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params;
  const profile = await getProfileLinkById(id).catch(() => undefined);
  if (!profile) {
    notFound();
  }

  return (
    <div className="flex w-full animate-fade-in flex-col gap-6">
      <Link
        href="/app"
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tableau de bord
      </Link>

      <div className="relative flex flex-col gap-4">
        <div
          aria-hidden="true"
          className="aura-halo -z-10 -left-16 -top-24 pointer-events-none absolute h-64 w-[28rem]"
        />
        <h1 className="font-bold font-brand text-3xl leading-tight sm:text-4xl">
          Statistiques
        </h1>
        <div
          className={cn(AURA_CARD_CLASS, 'flex items-center gap-3 p-4 sm:p-4')}
        >
          <AuraAvatar
            name={profile.name}
            image={profile.image}
            className="size-12 p-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-bold font-brand">{profile.name}</p>
              {profile.verificationStatus === 'verified' && (
                <PersonalityVerificationBadge size="sm" />
              )}
            </div>
            <p className="truncate text-muted-foreground text-xs">
              {ROOT_DOMAIN}/{profile.link}
            </p>
          </div>
          <Link
            href={`/${profile.link}`}
            className="aura-cta inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-brand font-semibold text-sm transition-transform hover:scale-[1.03]"
          >
            <span className="hidden sm:inline">Ouvrir la fiche</span>
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      <Analytics linkId={id} />
    </div>
  );
}
