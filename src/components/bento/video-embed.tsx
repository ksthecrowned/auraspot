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
import { cn } from '@/lib/utils';
import {
  type VideoRef,
  parseVideoUrl,
  videoEmbedUrl,
  videoThumbnail,
} from '@/lib/video-embed';
import { api } from '@/trpc/react';
import type { VideoEmbedBentoSchema } from '@/types';
import { Pencil, Play, Video } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

type BentoData = z.infer<typeof VideoEmbedBentoSchema>;

// 4x2 and 4x4 suit YouTube (16:9); 2x4 suits TikTok and Shorts (vertical).
export const VIDEO_CARD_SIZES = ['2x2', '4x2', '2x4', '4x4'] as const;

const PROVIDER_LABEL = { youtube: 'YouTube', tiktok: 'TikTok' } as const;

function EmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
      <Video className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-muted-foreground text-xs">
        Collez un lien YouTube ou TikTok
      </p>
    </div>
  );
}

// Poster first; the player (and its trackers) loads only when the visitor
// presses play. While editing, the poster stays so the card can be dragged.
function VideoPlayer({
  video,
  playable,
}: {
  video: VideoRef;
  playable: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const thumbnail = videoThumbnail(video);
  const label = PROVIDER_LABEL[video.provider];

  if (playing && playable) {
    return (
      <iframe
        src={videoEmbedUrl(video)}
        title={`Vidéo ${label}`}
        className="h-full w-full rounded-2xl border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={!playable}
      onClick={() => setPlaying(true)}
      aria-label={`Lire la vidéo ${label}`}
      className="group/play relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-950 disabled:cursor-default"
    >
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover"
        />
      ) : (
        <SocialIcon
          platform={video.provider}
          size={48}
          className="text-white/15"
        />
      )}
      <span className="absolute inset-0 bg-black/20 transition-colors group-hover/play:bg-black/30" />
      <span className="relative flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover/play:scale-105">
        <Play className="ml-1 size-6 fill-black text-black" />
      </span>
      <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-white text-xs backdrop-blur-sm">
        <SocialIcon platform={video.provider} size={12} />
        {label}
      </span>
    </button>
  );
}

export default function VideoEmbedCard({
  bento,
  editable,
}: {
  bento: BentoData;
  editable?: boolean;
}) {
  const params = useParams<{ link: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [url, setUrl] = useState(bento.url ?? '');
  const [error, setError] = useState<string | null>(null);

  const queryClient = api.useContext();
  const { mutateAsync: updateBento, isPending } =
    api.profileLink.updateBento.useMutation();

  const video = bento.url ? parseVideoUrl(bento.url) : null;

  const { mutateAsync: resolveVideo, isPending: isResolving } =
    api.profileLink.resolveVideoUrl.useMutation();

  const handleSave = async () => {
    let next = url.trim();
    if (next && !parseVideoUrl(next)) {
      // TikTok share links (vm.tiktok.com…) are resolved by the server.
      const resolved = await resolveVideo({ url: next })
        .then((result) => result.url)
        .catch(() => null);
      if (!resolved) {
        setError(
          'Ce lien ne mène pas à une vidéo. Collez le lien d’une vidéo YouTube (ou Short) ou TikTok.'
        );
        return;
      }
      next = resolved;
      setUrl(resolved);
    }
    setError(null);
    queryClient.profileLink.getByLink.setData({ link: params.link }, (old) => {
      if (!old) {
        return old;
      }
      return {
        ...old,
        bento: old.bento.map((b) =>
          b.id === bento.id ? { ...b, url: next } : b
        ),
      };
    });
    await updateBento({
      link: params.link,
      bento: { ...bento, url: next },
    });
    setEditOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'group relative z-0 h-full w-full select-none rounded-2xl border border-border bg-card shadow-sm',
          editable
            ? 'transition-transform duration-200 ease-in-out md:cursor-move'
            : 'hover:-translate-y-0.5 transition-all duration-200 hover:shadow-md'
        )}
      >
        {editable && (
          <CardOverlay bento={bento} allowedSizes={VIDEO_CARD_SIZES} />
        )}

        {video ? (
          <VideoPlayer video={video} playable={!editable} />
        ) : (
          <EmptyState />
        )}

        {editable && (
          <button
            type="button"
            aria-label="Modifier la vidéo"
            className="absolute top-3 right-3 z-50 cursor-pointer rounded-lg border border-border/50 bg-background/90 p-1.5 text-muted-foreground opacity-0 shadow-md backdrop-blur-sm transition-all hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setUrl(bento.url ?? '');
              setError(null);
              setEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cal text-xl">
              Modifier le bloc vidéo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-url" className="font-medium text-sm">
                Lien de la vidéo
              </Label>
              <Input
                id="video-url"
                placeholder="https://youtu.be/… ou https://www.tiktok.com/@…/video/…"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                className="rounded-xl"
              />
              <p className="text-muted-foreground text-xs">
                YouTube (vidéo, Short ou live) ou TikTok, y compris le lien du
                bouton « Partager » (vm.tiktok.com).
              </p>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
            <Button
              onClick={handleSave}
              disabled={isPending || isResolving}
              className="w-full rounded-xl"
            >
              {isPending || isResolving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
