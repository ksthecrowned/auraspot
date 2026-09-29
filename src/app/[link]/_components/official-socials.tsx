'use client';

import { platformLabel, socialPlatformOf } from '@/lib/personality';
import { type RouterOutputs, api } from '@/trpc/react';
import { useParams } from 'next/navigation';
import type { IconType } from 'react-icons';
import { BsTwitterX } from 'react-icons/bs';
import {
  FaDiscord,
  FaFacebook,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaTelegram,
  FaTiktok,
  FaTwitch,
  FaYoutube,
} from 'react-icons/fa';

const ICONS: Record<string, IconType> = {
  instagram: FaInstagram,
  twitter: BsTwitterX,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  facebook: FaFacebook,
  github: FaGithub,
  linkedin: FaLinkedin,
  telegram: FaTelegram,
  discord: FaDiscord,
  twitch: FaTwitch,
};

// The full list stays available as blocks in the profile space.
const MAX_SOCIALS = 5;

const EXTRA_LABELS: Record<string, string> = {
  discord: 'Discord',
  twitch: 'Twitch',
};

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

// Quick-access icons for the social networks already present as link blocks
// (in grid order), plus any official link saved on the profile. No separate
// editor: adding a social block adds its icon here.
function collectSocials(profileLink: ProfileLinkData) {
  const fromBlocks = [...profileLink.bento]
    .sort(
      (a, b) =>
        (a.position.md?.y ?? 0) - (b.position.md?.y ?? 0) ||
        (a.position.md?.x ?? 0) - (b.position.md?.x ?? 0)
    )
    .flatMap((block) =>
      block.type === 'link' && block.href ? [block.href] : []
    );
  const fromProfile = profileLink.socialLinks.map((social) => social.url);

  const seen = new Set<string>();
  const socials: { platform: string; url: string }[] = [];
  for (const url of [...fromBlocks, ...fromProfile]) {
    const platform = socialPlatformOf(url);
    if (platform && !seen.has(platform)) {
      seen.add(platform);
      socials.push({ platform, url });
    }
  }
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
      {socials.map((social) => {
        const Icon = ICONS[social.platform] ?? FaGlobe;
        return (
          <a
            key={social.platform}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            title={
              EXTRA_LABELS[social.platform] ?? platformLabel(social.platform)
            }
            className="hover:-translate-y-0.5 flex size-10 items-center justify-center rounded-xl border border-border bg-background/80 text-foreground/80 shadow-sm transition-all hover:text-foreground"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </nav>
  );
}
