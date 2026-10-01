import { PLATFORMS, type SocialPlatform } from '@/lib/social-platforms';
import { cn } from '@/lib/utils';
import { Music2 } from 'lucide-react';
import type { IconType } from 'react-icons';
import {
  FaApple,
  FaDeezer,
  FaDiscord,
  FaFacebook,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaSnapchat,
  FaSoundcloud,
  FaSpotify,
  FaTelegram,
  FaThreads,
  FaTiktok,
  FaTwitch,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
import { SiAudiomack } from 'react-icons/si';

// Boomplay has no icon in react-icons: a generic music note stands for it.
const ICONS: Record<SocialPlatform, IconType> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  twitter: FaXTwitter,
  whatsapp: FaWhatsapp,
  snapchat: FaSnapchat,
  threads: FaThreads,
  telegram: FaTelegram,
  linkedin: FaLinkedin,
  spotify: FaSpotify,
  applemusic: FaApple,
  boomplay: Music2 as unknown as IconType,
  audiomack: SiAudiomack,
  deezer: FaDeezer,
  soundcloud: FaSoundcloud,
  twitch: FaTwitch,
  discord: FaDiscord,
  github: FaGithub,
  website: FaGlobe,
};

// Snapchat's yellow is unreadable on white: its icon uses a darker yellow.
const ICON_COLOR_OVERRIDE: Partial<Record<SocialPlatform, string>> = {
  snapchat: '#E6C700',
};

export function socialIconColor(platform: SocialPlatform) {
  return ICON_COLOR_OVERRIDE[platform] ?? PLATFORMS[platform].color;
}

// The platform's logo. `colored` paints it in the brand colour; logos
// without one (X, TikTok, Threads, GitHub…) follow the text colour.
export function SocialIcon({
  platform,
  size = 20,
  colored = false,
  className,
}: {
  platform: SocialPlatform;
  size?: number;
  colored?: boolean;
  className?: string;
}) {
  const Icon = ICONS[platform];
  const color = colored ? socialIconColor(platform) : null;
  return (
    <Icon
      size={size}
      className={cn('shrink-0', className)}
      style={color ? { color } : undefined}
      aria-hidden="true"
    />
  );
}
