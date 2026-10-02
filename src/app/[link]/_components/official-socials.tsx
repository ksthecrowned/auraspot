'use client';

import { SocialIcon } from '@/components/icons/social-icons';
import {
  PLATFORMS,
  type SocialPlatform,
  isSocialPlatform,
  socialListRank,
  socialPlatformOf,
} from '@/lib/social-platforms';
import { type RouterOutputs, api } from '@/trpc/react';
import { useParams } from 'next/navigation';

// The full list stays available as blocks in the profile space.
const MAX_SOCIALS = 6;

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

// Quick-access icons for networks already present as link blocks or official
// links. Social networks (WhatsApp, Facebook, Instagram, LinkedIn, …) come
// first when they exist; music and other platforms fill the remaining slots.
function collectSocials(profileLink: ProfileLinkData) {
  const fromBlocks = profileLink.bento.flatMap((block) =>
    block.type === 'link' && block.href ? [block.href] : []
  );
  // Official links keep the platform they were saved with (a website too).
  const fromProfile = profileLink.socialLinks.map((social) => ({
    url: social.url,
    platform: isSocialPlatform(social.platform)
      ? social.platform
      : socialPlatformOf(social.url),
  }));

  const seen = new Set<SocialPlatform>();
  const socials: { platform: SocialPlatform; url: string }[] = [];
  const candidates = [
    ...fromBlocks.map((url) => ({ url, platform: socialPlatformOf(url) })),
    ...fromProfile,
  ];
  for (const { url, platform } of candidates) {
    if (platform && !seen.has(platform)) {
      seen.add(platform);
      socials.push({ platform, url });
    }
  }
  socials.sort(
    (a, b) => socialListRank(a.platform) - socialListRank(b.platform)
  );
  return socials;
}

export default function OfficialSocials({
  profileLink: initialData,
}: {
  profileLink: ProfileLinkData;
}) {
  const { link } = useParams<{ link: string }>();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link },
    { initialData, staleTime: 60_000 }
  );

  if (!profileLink) {
    return null;
  }

  const socials = collectSocials(profileLink).slice(0, MAX_SOCIALS);
  if (socials.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Réseaux sociaux"
      className="flex flex-wrap items-center @4xl:justify-start justify-center gap-2"
    >
      {socials.map((social) => (
        <a
          key={social.platform}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          title={PLATFORMS[social.platform].label}
          className="hover:-translate-y-0.5 flex size-10 items-center justify-center rounded-xl border border-border bg-background/80 text-foreground/80 shadow-sm transition-all hover:text-foreground"
        >
          <SocialIcon platform={social.platform} size={16} />
        </a>
      ))}
    </nav>
  );
}
