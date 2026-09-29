'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SupportPrivacyToggle({
  supportId,
  isPublic,
}: {
  supportId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const setVisibility = api.support.setVisibility.useMutation();
  const [checked, setChecked] = useState(isPublic);

  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        disabled={setVisibility.isPending}
        onChange={async (event) => {
          const next = event.target.checked;
          setChecked(next);
          try {
            await setVisibility.mutateAsync({ supportId, isPublic: next });
            router.refresh();
          } catch {
            setChecked(!next);
          }
        }}
      />
      Afficher mon nom
      {setVisibility.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
    </label>
  );
}

export function CancelRecurringButton({
  recurringSupportId,
}: {
  recurringSupportId: string;
}) {
  const router = useRouter();
  const cancel = api.support.cancelRecurring.useMutation();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={cancel.isPending}
        onClick={async () => {
          setError(null);
          try {
            await cancel.mutateAsync({ recurringSupportId });
            router.refresh();
          } catch {
            setError('L’arrêt n’a pas abouti.');
          }
        }}
      >
        {cancel.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Arrêter le renouvellement'
        )}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
