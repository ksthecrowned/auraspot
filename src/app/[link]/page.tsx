import {
  defaultMetadata,
  ogMetadata,
  twitterMetadata,
} from '@/app/shared-metadata';
import OnboardingTour from '@/components/onboarding-tour';
import { parseViewSource } from '@/lib/share-card';
import { SITE_URL } from '@/lib/site';
import { canReceiveSupport } from '@/lib/support-eligibility';
import { activeCollected, getPublicGoal } from '@/server/db/utils/support-goal';
import { api } from '@/trpc/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type CSSProperties, Suspense, cache } from 'react';
import ActionBar from './_components/action-bar';
import { BentoHistoryProvider } from './_components/bento-history';
import Community from './_components/community';
import GoalManager from './_components/goal-manager';
import OfficialSocials from './_components/official-socials';
import { PreviewProvider } from './_components/preview-context';
import ProfileAbout from './_components/profile-about';
import ProfileFooter from './_components/profile-footer';
import ProfileHero from './_components/profile-hero';
import ProfileSpace from './_components/profile-space';
import ProfileTopBar from './_components/profile-top-bar';
import StripViewSource from './_components/strip-view-source';
import SupportButton from './_components/support-button';
import SupportGoalCard from './_components/support-goal-card';
import ThemeWrapper from './_components/theme-wrapper';
import ViewportContainer from './_components/viewport-container';

type Props = {
  params: Promise<{
    link: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function viewSource(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseViewSource(raw) ?? undefined;
}

const getProfileLink = cache((link: string, src?: string) => {
  return api.profileLink.getByLink({ link, src });
});

const HTML_TAG_RE = /<[^>]*>/g;

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { link } = await params;
  const query = await searchParams;

  const profileLink = await getProfileLink(link, viewSource(query.src));

  const title = profileLink?.name ?? defaultMetadata.title;
  const description = profileLink
    ? (profileLink.bio ?? `This is ${profileLink.name}'s profile.`).replace(
        HTML_TAG_RE,
        ''
      )
    : defaultMetadata.description;
  const image = `/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`;

  return {
    ...defaultMetadata,
    title,
    description,
    twitter: {
      ...twitterMetadata,
      title,
      description,
      images: [image],
    },
    openGraph: {
      ...ogMetadata,
      title,
      description,
      images: [image],
    },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { link } = await params;
  const query = await searchParams;
  const profileLink = await getProfileLink(link, viewSource(query.src));

  if (!profileLink) {
    notFound();
  }

  if (profileLink.status === 'suspended' && !profileLink.canEdit) {
    notFound();
  }

  const published = profileLink.status !== 'suspended';
  const [goal, collected] = published
    ? await Promise.all([
        getPublicGoal(profileLink.id),
        profileLink.canEdit
          ? activeCollected(profileLink.id)
          : Promise.resolve(null),
      ])
    : [null, null];

  const bio = (profileLink.bio ?? '').replace(HTML_TAG_RE, '');
  const profileUrl = `${SITE_URL}/${profileLink.link}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profileLink.name,
      url: profileUrl,
      ...(profileLink.image && { image: profileLink.image }),
      ...(bio && { description: bio }),
      ...(profileLink.location && {
        homeLocation: {
          '@type': 'Place',
          name: profileLink.location,
        },
      }),
      sameAs: [
        ...profileLink.socialLinks.map((social) => social.url),
        ...profileLink.bento
          .filter((b) => b.type === 'link' && b.href)
          .map((b) => (b as { href: string }).href),
      ],
    },
  };

  const accentStyle = profileLink.accentColor
    ? ({ '--aura-accent': profileLink.accentColor } as CSSProperties)
    : undefined;
  const canDonate = canReceiveSupport(profileLink);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD with server-only data from our DB
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ThemeWrapper
        theme={profileLink.theme}
        darkMode={profileLink.darkMode}
        accentColor={profileLink.accentColor}
      >
        <PreviewProvider>
          <Suspense>
            <BentoHistoryProvider>
              <ViewportContainer>
                <div className="@container animate-fade-in" style={accentStyle}>
                  <StripViewSource />
                  <ProfileTopBar profileLink={profileLink} />

                  <div className="mt-8 grid @4xl:grid-cols-[340px_minmax(0,1fr)] @4xl:gap-12 gap-8">
                    <aside className="@4xl:sticky @4xl:top-8 flex flex-col gap-5 @4xl:self-start">
                      <ProfileHero profileLink={profileLink} />
                      {goal && (
                        <SupportGoalCard
                          goal={goal}
                          collected={collected === null ? undefined : collected}
                        />
                      )}
                      {published && profileLink.canEdit && (
                        <GoalManager
                          slug={profileLink.link}
                          hasGoal={Boolean(goal)}
                        />
                      )}
                      {published && (goal || profileLink.canEdit) && (
                        <a
                          href={`/${profileLink.link}/objectifs`}
                          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
                        >
                          Historique des objectifs
                        </a>
                      )}
                      <OfficialSocials profileLink={profileLink} />
                      {canDonate && (
                        <SupportButton
                          slug={profileLink.link}
                          name={profileLink.name}
                          canEdit={profileLink.canEdit}
                          variant="inline"
                        />
                      )}
                    </aside>

                    <main className="flex min-w-0 flex-col gap-8">
                      <Community
                        name={profileLink.name}
                        slug={profileLink.link}
                        supporters={profileLink.supporters}
                        dedications={profileLink.dedications}
                        canEdit={profileLink.canEdit}
                      />
                      <ProfileAbout profileLink={profileLink} />
                      <ProfileSpace profileLink={profileLink} />
                    </main>
                  </div>

                  <ProfileFooter customFooter={profileLink.customFooter} />

                  {canDonate && (
                    <SupportButton
                      slug={profileLink.link}
                      name={profileLink.name}
                      canEdit={profileLink.canEdit}
                      variant="sticky"
                    />
                  )}
                </div>

                {profileLink.canEdit && (
                  <>
                    <ActionBar />
                    <OnboardingTour />
                  </>
                )}
              </ViewportContainer>
            </BentoHistoryProvider>
          </Suspense>
        </PreviewProvider>
      </ThemeWrapper>
    </>
  );
}
