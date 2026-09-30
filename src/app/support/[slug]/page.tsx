import PersonalityVerificationBadge from '@/app/[link]/_components/personality-verification-badge';
import ThemeWrapper from '@/app/[link]/_components/theme-wrapper';
import { AuraAvatar } from '@/components/aura-avatar';
import { Wordmark } from '@/components/brand';
import CreateSupportForm from '@/components/forms/create-support';
import { auth } from '@/lib/auth';
import { MAX_SUPPORT_AMOUNT, MIN_SUPPORT_AMOUNT } from '@/lib/money';
import { getSupportPage } from '@/server/db/utils/support';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function initialAmount(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (
    !Number.isInteger(parsed) ||
    parsed < MIN_SUPPORT_AMOUNT ||
    parsed > MAX_SUPPORT_AMOUNT
  ) {
    return undefined;
  }
  return parsed;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const personality = await getSupportPage(slug);
  return {
    title: personality ? `Faire un don à ${personality.name}` : 'Faire un don',
    description:
      'Soutenez une personnalité sans créer de compte. Le montant n’est pas public.',
  };
}

export default async function SupportPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const personality = await getSupportPage(slug);
  if (!personality) {
    notFound();
  }
  const session = await auth.api.getSession({ headers: await headers() });

  const accentStyle = personality.accentColor
    ? ({ '--aura-accent': personality.accentColor } as CSSProperties)
    : undefined;

  return (
    <ThemeWrapper
      theme={personality.theme}
      darkMode={personality.darkMode}
      accentColor={personality.accentColor}
    >
      {/* Full-width clip so the halo fades out instead of being cut at the column edge. */}
      <div className="w-full overflow-x-clip" style={accentStyle}>
        <div className="mx-auto flex min-h-screen w-full max-w-md animate-fade-in flex-col px-4 pt-5 pb-12">
          <header className="flex items-center justify-between gap-3">
            <Link
              href="/personalities"
              aria-label="Découvrir des personnalités"
            >
              <Wordmark className="text-xl" />
            </Link>
            <Link
              href={`/${personality.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Retour à la fiche
            </Link>
          </header>

          <section className="relative mt-10 flex flex-col items-center gap-3 text-center">
            <div
              aria-hidden="true"
              className="aura-halo -z-10 -inset-x-16 -top-20 pointer-events-none absolute h-72"
            />
            <AuraAvatar name={personality.name} image={personality.image} />
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              {personality.name}
              {personality.verificationStatus === 'verified' && (
                <PersonalityVerificationBadge size="sm" />
              )}
            </div>
            <h1 className="font-bold font-brand text-3xl leading-tight">
              Faire un don à {personality.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              Sans compte. Le montant reste privé.
            </p>
          </section>

          <div className="mt-8 rounded-[1.25rem] border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(11,13,26,0.05),0_8px_24px_-12px_rgba(180,60,240,0.25)] sm:p-6">
            <CreateSupportForm
              slug={personality.slug}
              signedIn={Boolean(session)}
              initialAmount={initialAmount(query.amount)}
              defaultDisplayName={session?.user.name}
            />
          </div>
        </div>
      </div>
    </ThemeWrapper>
  );
}
