'use client';

import { Wordmark } from '@/components/brand';
import LinkQRModal from '@/components/modals/link-qr-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { SITE_URL } from '@/lib/site';
import type { RouterOutputs } from '@/trpc/react';
import {
  Eye,
  Flag,
  Monitor,
  MoreHorizontal,
  PenLine,
  QrCode,
  Share2,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { usePreview } from './preview-context';

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

export default function ProfileTopBar({
  profileLink,
}: {
  profileLink: ProfileLinkData;
}) {
  const { preview, setPreview, viewport, setViewport } = usePreview();
  const url = `${SITE_URL}/${profileLink.link}`;

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: profileLink.name, url }).catch(() => undefined);
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => toast({ title: 'Lien copié' }))
      .catch(() => undefined);
  };

  return (
    <header className="flex items-center justify-between gap-3">
      <Link href="/personalities" aria-label="Découvrir des personnalités">
        <Wordmark className="text-lg" />
      </Link>

      <div className="flex items-center gap-1.5">
        {profileLink.canEdit && (
          <>
            <Button
              size="icon"
              variant={preview ? 'default' : 'outline'}
              className="size-9 rounded-full"
              onClick={() => setPreview(!preview)}
              data-tour="preview-toggle"
              title={preview ? 'Revenir à l’édition' : 'Voir comme un visiteur'}
            >
              {preview ? (
                <PenLine className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
            <div
              className="hidden items-center rounded-full border border-border p-0.5 md:flex"
              data-tour="viewport-switcher"
            >
              <Button
                size="icon"
                variant={viewport === 'desktop' ? 'default' : 'ghost'}
                className="size-8 rounded-full"
                onClick={() => setViewport('desktop')}
                title="Aperçu ordinateur"
              >
                <Monitor className="size-4" />
              </Button>
              <Button
                size="icon"
                variant={viewport === 'mobile' ? 'default' : 'ghost'}
                className="size-8 rounded-full"
                onClick={() => setViewport('mobile')}
                title="Aperçu mobile"
              >
                <Smartphone className="size-4" />
              </Button>
            </div>
          </>
        )}

        <Button
          size="icon"
          variant="outline"
          className="size-9 rounded-full"
          onClick={share}
          title="Partager"
        >
          <Share2 className="size-4" />
        </Button>
        <LinkQRModal>
          <Button
            size="icon"
            variant="outline"
            className="size-9 rounded-full"
            title="QR code"
          >
            <QrCode className="size-4" />
          </Button>
        </LinkQRModal>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="size-9 rounded-full"
              title="Plus"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/report/${profileLink.link}`}>
                <Flag className="mr-2 size-4" />
                Signaler
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
