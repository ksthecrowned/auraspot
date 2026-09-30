import PersonalityVerificationBadge from '@/app/[link]/_components/personality-verification-badge';
import ThemeWrapper from '@/app/[link]/_components/theme-wrapper';
import { AuraAvatar } from '@/components/aura-avatar';
import { AURA_CARD_CLASS } from '@/components/forms/aura-fields';
import SiteHeader, { HEADER_PILL_CLASS } from '@/components/site-header';
import { cn } from '@/lib/utils';
import { getPersonalityAppearance } from '@/server/db/utils/personality';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

// Shared layout for the pages around a personality profile (donation,
// checkout, claim, report, withdrawals): the personality's theme and accent,
// the aura halo, and an identity header. Without a slug it uses the default
// AuraSpot look (e.g. the supporter's own history).
export default async function PersonalityPageShell({
  slug,
  title,
  subtitle,
  back,
  children,
  bare = false,
}: {
  slug?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
  // true: children are rendered without the surrounding card.
  bare?: boolean;
}) {
  const personality = slug ? await getPersonalityAppearance(slug) : null;
  const backLink =
    back ??
    (personality
      ? { href: `/${personality.slug}`, label: 'Retour à la fiche' }
      : undefined);

  const accentStyle = personality?.accentColor
    ? ({ '--aura-accent': personality.accentColor } as CSSProperties)
    : undefined;

  return (
    <ThemeWrapper
      theme={personality?.theme}
      darkMode={personality?.darkMode}
      accentColor={personality?.accentColor}
    >
      {/* Full-width clip so the halo fades out instead of being cut at the column edge. */}
      <div
        className="flex min-h-screen w-full flex-col overflow-x-clip"
        style={accentStyle}
      >
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 md:px-8">
          <SiteHeader
            actions={
              backLink ? (
                <Link href={backLink.href} className={HEADER_PILL_CLASS}>
                  <ArrowLeft className="size-4" />
                  {backLink.label}
                </Link>
              ) : undefined
            }
          />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 animate-fade-in flex-col px-4 pb-12">
          <section className="relative mt-10 flex flex-col items-center gap-3 text-center">
            <div
              aria-hidden="true"
              className="aura-halo -z-10 -inset-x-16 -top-20 pointer-events-none absolute h-72"
            />
            {personality && (
              <>
                <AuraAvatar name={personality.name} image={personality.image} />
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  {personality.name}
                  {personality.verificationStatus === 'verified' && (
                    <PersonalityVerificationBadge size="sm" />
                  )}
                </div>
              </>
            )}
            <h1 className="font-bold font-brand text-3xl leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            )}
          </section>

          <div className={cn('mt-8', !bare && AURA_CARD_CLASS)}>{children}</div>
        </div>
      </div>
    </ThemeWrapper>
  );
}
