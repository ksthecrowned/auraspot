'use client';

import {
  AURA_PRIMARY_BUTTON,
  AURA_SECONDARY_BUTTON,
} from '@/components/forms/aura-fields';
import { shareCardUrl } from '@/lib/share-card';
import { SITE_URL } from '@/lib/site';
import { Download, Loader2, Share2 } from 'lucide-react';
import { useState } from 'react';

export default function ShareSupportCard({
  paymentId,
  slug,
  headline,
}: {
  paymentId: string;
  slug: string;
  headline: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = shareCardUrl(SITE_URL, slug);
  const imageUrl = `/api/og/support/${paymentId}`;

  const loadImage = async () => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('image');
    }
    return response.blob();
  };

  const share = async () => {
    setError(null);
    setPending(true);
    try {
      const blob = await loadImage();
      const file = new File([blob], 'soutien.png', { type: 'image/png' });
      const payload = { files: [file], text: headline, url };
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
        return;
      }
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${headline}\n${url}`)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === 'AbortError'
      ) {
        return;
      }
      setError('Le partage n’a pas abouti. Vous pouvez télécharger l’image.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={share}
        className={AURA_PRIMARY_BUTTON}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Share2 className="size-4" />
        )}
        Partager sur WhatsApp
      </button>
      <a
        href={imageUrl}
        download="soutien.png"
        className={AURA_SECONDARY_BUTTON}
      >
        <Download className="size-4" />
        Télécharger l’image
      </a>
      {error && <p className="text-center text-destructive text-sm">{error}</p>}
    </div>
  );
}
