'use client';

import { AURA_ERROR, AURA_TEXTAREA } from '@/components/forms/aura-fields';
import { THANK_YOU_MAX_LENGTH } from '@/lib/dedication';
import { api } from '@/trpc/react';
import { Heart, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DedicationActions({
  supportId,
}: {
  supportId: string;
}) {
  const router = useRouter();
  const thank = api.support.thank.useMutation();
  const hide = api.support.hideMessage.useMutation();
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pending = thank.isPending || hide.isPending;

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        value={reply}
        maxLength={THANK_YOU_MAX_LENGTH}
        placeholder="Un mot de remerciement, facultatif"
        onChange={(event) => setReply(event.target.value)}
        className={AURA_TEXTAREA}
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline disabled:opacity-50"
          onClick={async () => {
            setError(null);
            try {
              await thank.mutateAsync({
                supportId,
                thankYouReply: reply,
              });
              setReply('');
              router.refresh();
            } catch (submitError) {
              setError(
                submitError instanceof Error
                  ? submitError.message
                  : 'Le remerciement n’a pas abouti.'
              );
            }
          }}
        >
          {thank.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Heart className="size-3.5" />
          )}
          Remercier
        </button>
        <button
          type="button"
          disabled={pending}
          className="font-medium text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          onClick={async () => {
            setError(null);
            try {
              await hide.mutateAsync({ supportId });
              router.refresh();
            } catch (submitError) {
              setError(
                submitError instanceof Error
                  ? submitError.message
                  : 'Le message n’a pas pu être masqué.'
              );
            }
          }}
        >
          Masquer
        </button>
      </div>
      {error && <p className={AURA_ERROR}>{error}</p>}
    </div>
  );
}
