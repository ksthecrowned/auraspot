'use client';

import { Button } from '@/components/ui/button';
import { platformLabel } from '@/lib/personality';
import { type RouterOutputs, api } from '@/trpc/react';
import { Pencil } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { IconType } from 'react-icons';
import { BsTwitterX } from 'react-icons/bs';
import {
  FaFacebook,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaTelegram,
  FaTiktok,
  FaYoutube,
} from 'react-icons/fa';
import EditSocialsDialog from './edit-socials-dialog';
import { usePreview } from './preview-context';

const ICONS: Record<string, IconType> = {
  instagram: FaInstagram,
  twitter: BsTwitterX,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  facebook: FaFacebook,
  github: FaGithub,
  linkedin: FaLinkedin,
  telegram: FaTelegram,
  website: FaGlobe,
};

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

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
  const { preview } = usePreview();

  if (!profileLink) {
    return null;
  }

  const isEditable = profileLink.canEdit && !preview;
  const { socialLinks } = profileLink;

  if (socialLinks.length === 0 && !isEditable) {
    return null;
  }

  return (
    <nav
      aria-label="Réseaux officiels"
      className="flex flex-wrap items-center @4xl:justify-start justify-center gap-2"
    >
      {socialLinks.map((social) => {
        const Icon = ICONS[social.platform] ?? FaGlobe;
        return (
          <a
            key={social.id}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            title={platformLabel(social.platform)}
            className="hover:-translate-y-0.5 flex size-10 items-center justify-center rounded-xl border border-border bg-background/80 text-foreground/80 shadow-sm transition-all hover:text-foreground"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
      {isEditable && (
        <EditSocialsDialog
          key={socialLinks.map((social) => social.id).join()}
          profileLinkId={profileLink.id}
          socialLinks={socialLinks}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-10 rounded-xl border border-border border-dashed px-3 text-xs"
          >
            <Pencil className="mr-1 size-3.5" />
            {socialLinks.length ? 'Réseaux' : 'Ajouter vos réseaux officiels'}
          </Button>
        </EditSocialsDialog>
      )}
    </nav>
  );
}
