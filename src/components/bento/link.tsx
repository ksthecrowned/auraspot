'use client';

import CardOverlay from '@/components/bento/overlay';
import { SocialIcon } from '@/components/icons/social-icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { getMetadata } from '@/lib/metadata';
import {
  PLATFORMS,
  type SocialPlatform,
  socialPlatformOf,
} from '@/lib/social-platforms';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import type { LinkBentoSchema } from '@/types';
import { ArrowUpRight, Pencil } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import type * as z from 'zod';

type Metadata = Awaited<ReturnType<typeof getMetadata>>;
type BentoData = z.infer<typeof LinkBentoSchema>;

// Sizes that have proper layouts for link cards
export const LINK_CARD_SIZES = ['2x2', '4x1', '4x2'] as const;

const LEADING_WWW_RE = /^(www\.|m\.)/;
const TRAILING_SLASH_RE = /\/$/;

// Brand colours bright enough to need dark text on top (Snapchat's yellow).
function isLightColor(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72;
}

function platformOf(url: string): SocialPlatform | null {
  const platform = socialPlatformOf(url);
  return platform === 'website' ? null : platform;
}

function getIcon(url: string, metadata?: Metadata) {
  const platform = platformOf(url);
  if (platform) {
    return <SocialIcon platform={platform} size={20} colored />;
  }
  const hostname = new URL(url).hostname;
  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`}
      alt={metadata?.title ?? url}
      width={24}
      height={24}
      className="rounded-md"
    />
  );
}

function getLargeIcon(url: string) {
  const platform = platformOf(url);
  return platform ? <SocialIcon platform={platform} size={32} colored /> : null;
}

function lastPathSegment(url: URL) {
  const segments = url.pathname.split('/').filter(Boolean);
  return segments.at(-1);
}

function getTitle(url: string, metadata?: Metadata) {
  const platform = platformOf(url);
  // Handle-based profiles read as @handle; music and invite links keep the
  // page title (an artist id is not a name).
  if (platform && PLATFORMS[platform].handlePrefix) {
    const handle = lastPathSegment(new URL(url));
    if (handle) {
      return handle.startsWith('@') ? handle : `@${handle}`;
    }
  }
  return metadata?.title ?? (platform ? PLATFORMS[platform].label : undefined);
}

function getDescription(url: string, metadata?: Metadata) {
  const platform = platformOf(url);
  if (platform) {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(LEADING_WWW_RE, '');
    return `${host}${parsed.pathname.replace(TRAILING_SLASH_RE, '')}`;
  }
  return metadata?.description ?? null;
}

// A span, not a button: the whole card is already the link.
function ActionPill({ url }: { url: string }) {
  const platform = platformOf(url);
  if (!platform) {
    return null;
  }
  const { action, color } = PLATFORMS[platform];
  const lightBrand = color ? isLightColor(color) : false;
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center rounded-full px-4 font-semibold text-xs shadow-sm transition-opacity hover:opacity-90',
        color ? '' : 'bg-foreground text-background',
        color && (lightBrand ? 'text-black' : 'text-white')
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {action}
    </span>
  );
}

// Soft brand-coloured light, for the card corner and the wide layout.
function brandTint(url: string, strength: number) {
  const platform = platformOf(url);
  const color = platform ? PLATFORMS[platform].color : null;
  return color
    ? `color-mix(in oklab, ${color} ${strength}%, transparent)`
    : `color-mix(in oklab, var(--foreground) ${Math.round(strength / 2)}%, transparent)`;
}

function brandWash(url: string) {
  return `radial-gradient(120% 100% at 0% 0%, ${brandTint(url, 14)}, transparent 65%)`;
}

// --- Layout Components ---

function CardWrapper({
  bento,
  editable,
  className,
  children,
  onEdit,
}: {
  bento: BentoData;
  editable?: boolean;
  className?: string;
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  const { link: linkSlug } = useParams<{ link: string }>();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link: linkSlug },
    { enabled: !editable }
  );
  const { mutate: trackClick } = api.profileLink.trackClick.useMutation();

  const handleClick = () => {
    if (!editable && profileLink && bento.href) {
      trackClick({
        linkId: profileLink.id,
        bentoId: bento.id,
        href: bento.href,
      });
    }
  };

  const Comp = editable ? 'div' : Link;
  return (
    <Comp
      href={bento.href ?? ''}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        'group relative z-0 h-full w-full select-none rounded-2xl border border-border bg-card shadow-sm',
        editable
          ? 'transition-transform duration-200 ease-in-out md:cursor-move'
          : 'hover:-translate-y-0.5 cursor-pointer transition-all duration-200 hover:border-border/80 hover:shadow-md',
        className
      )}
    >
      {editable && <CardOverlay bento={bento} allowedSizes={LINK_CARD_SIZES} />}
      <div
        aria-hidden="true"
        className="-z-10 pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: brandWash(bento.href ?? '') }}
      />
      {children}
      {!editable && (
        <span className="absolute top-3.5 right-3.5 inline-flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:text-foreground group-hover:opacity-100">
          <ArrowUpRight className="size-3.5" />
        </span>
      )}
      {editable && onEdit && (
        <button
          type="button"
          className="absolute top-3 right-3 z-50 cursor-pointer rounded-lg border border-border/50 bg-background/90 p-1.5 text-muted-foreground opacity-0 shadow-md backdrop-blur-sm transition-all hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </Comp>
  );
}

function IconBadge({
  href,
  metadata,
  size = 'md',
}: {
  href: string;
  metadata?: Metadata;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-border/60 bg-background/90 shadow-sm',
        size === 'sm' && 'h-8 w-8 rounded-lg',
        size === 'md' && 'h-11 w-11 rounded-xl',
        size === 'lg' && 'h-14 w-14 rounded-2xl'
      )}
    >
      {size === 'lg'
        ? (getLargeIcon(href) ?? getIcon(href, metadata))
        : getIcon(href, metadata)}
    </div>
  );
}

// 2x2: Compact card
function CompactLayout({
  bento,
  editable,
  metadata,
  title,
  description,
  onEdit,
}: {
  bento: BentoData;
  editable?: boolean;
  metadata?: Metadata;
  title?: string | null;
  description?: string | null;
  onEdit?: () => void;
}) {
  return (
    <CardWrapper
      bento={bento}
      editable={editable}
      className="flex flex-col p-5"
      onEdit={onEdit}
    >
      <IconBadge href={bento.href ?? ''} metadata={metadata} />
      <div className="mt-auto space-y-0.5">
        {title && (
          <p className="truncate font-cal text-base leading-tight">{title}</p>
        )}
        {description && (
          <p className="truncate text-muted-foreground text-xs">
            {description}
          </p>
        )}
        <div className="pt-2.5">
          <ActionPill url={bento.href ?? ''} />
        </div>
      </div>
    </CardWrapper>
  );
}

// 4x1: Banner — horizontal icon + title + action
function BannerLayout({
  bento,
  editable,
  metadata,
  title,
  onEdit,
}: {
  bento: BentoData;
  editable?: boolean;
  metadata?: Metadata;
  title?: string | null;
  onEdit?: () => void;
}) {
  return (
    <CardWrapper
      bento={bento}
      editable={editable}
      className="flex items-center gap-x-3 px-5"
      onEdit={onEdit}
    >
      <IconBadge href={bento.href ?? ''} metadata={metadata} size="sm" />
      <span className="truncate font-cal text-sm">{title}</span>
      <div className="ml-auto shrink-0">
        <ActionPill url={bento.href ?? ''} />
      </div>
    </CardWrapper>
  );
}

// 4x2: Wide — social cards get branded accent, generic links get OG image
function WideLayout({
  bento,
  editable,
  metadata,
  title,
  description,
  onEdit,
}: {
  bento: BentoData;
  editable?: boolean;
  metadata?: Metadata;
  title?: string | null;
  description?: string | null;
  onEdit?: () => void;
}) {
  const href = bento.href ?? '';
  const platform = platformOf(href);
  const ogImage = metadata?.image;

  // Generic link with OG image: image on the right
  if (!platform && ogImage) {
    return (
      <CardWrapper
        bento={bento}
        editable={editable}
        className="flex overflow-hidden"
        onEdit={onEdit}
      >
        <div className="flex flex-1 flex-col justify-between p-5">
          <IconBadge href={href} metadata={metadata} />
          <div className="mt-auto space-y-1">
            {title && <p className="font-cal text-sm leading-tight">{title}</p>}
            {description && (
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="relative w-2/5 shrink-0">
          <Image
            src={ogImage}
            alt={title ?? href}
            fill
            className="object-cover"
          />
        </div>
      </CardWrapper>
    );
  }

  // Social card or generic without OG: branded wide layout
  return (
    <CardWrapper
      bento={bento}
      editable={editable}
      className="flex overflow-hidden"
      onEdit={onEdit}
    >
      {/* Branded icon area */}
      <div
        className="flex w-35 shrink-0 items-center justify-center"
        style={{ backgroundColor: brandTint(href, 8) }}
      >
        <IconBadge href={href} metadata={metadata} size="lg" />
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col justify-center gap-y-1 p-5">
        {title && <p className="font-cal text-base leading-tight">{title}</p>}
        {description && (
          <p className="truncate text-muted-foreground text-xs">
            {description}
          </p>
        )}
        <div className="pt-2">
          <ActionPill url={href} />
        </div>
      </div>
    </CardWrapper>
  );
}

// --- Main Component ---

export default function LinkCard({
  bento,
  editable,
}: {
  bento: BentoData;
  editable?: boolean;
}) {
  const params = useParams<{ link: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [href, setHref] = useState(bento.href ?? '');

  const queryClient = api.useContext();
  const { mutateAsync: updateBento, isPending } =
    api.profileLink.updateBento.useMutation();

  const { data: metadata } = api.profileLink.getMetadataOfURL.useQuery(
    { url: bento.href ?? '' },
    { enabled: !!bento.href }
  );

  const handleSave = async () => {
    queryClient.profileLink.getByLink.setData({ link: params.link }, (old) => {
      if (!old) {
        return old;
      }
      return {
        ...old,
        bento: old.bento.map((b) => (b.id === bento.id ? { ...b, href } : b)),
      };
    });

    await updateBento({
      link: params.link,
      bento: { ...bento, href },
    });
    setEditOpen(false);
  };

  if (!bento.href) {
    return null;
  }

  const title = getTitle(bento.href, metadata ?? undefined);
  const description = getDescription(bento.href, metadata ?? undefined);
  const smSize = bento.size.sm ?? '2x2';
  const mdSize = bento.size.md ?? '2x2';
  const onEdit = editable ? () => setEditOpen(true) : undefined;

  const layout =
    smSize === '4x1' || mdSize === '4x1' ? (
      <BannerLayout
        bento={bento}
        editable={editable}
        metadata={metadata ?? undefined}
        title={title}
        onEdit={onEdit}
      />
    ) : mdSize === '4x2' ? (
      <WideLayout
        bento={bento}
        editable={editable}
        metadata={metadata ?? undefined}
        title={title}
        description={description}
        onEdit={onEdit}
      />
    ) : (
      <CompactLayout
        bento={bento}
        editable={editable}
        metadata={metadata ?? undefined}
        title={title}
        description={description}
        onEdit={onEdit}
      />
    );

  return (
    <>
      {layout}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cal text-xl">
              Modifier le lien
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-href" className="font-medium text-sm">
                URL
              </Label>
              <Input
                id="link-href"
                placeholder="https://example.com"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="w-full rounded-xl"
            >
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
