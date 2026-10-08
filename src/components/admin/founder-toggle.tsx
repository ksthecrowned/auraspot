'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function FounderToggle({
  personalityId,
  founder,
}: {
  personalityId: string;
  founder: boolean;
}) {
  const router = useRouter();
  const setFounder = api.admin.setFounder.useMutation();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={setFounder.isPending}
        onClick={async () => {
          setError(null);
          try {
            await setFounder.mutateAsync({
              personalityId,
              founder: !founder,
            });
            router.refresh();
          } catch {
            setError('Le statut fondateur n’a pas pu être modifié.');
          }
        }}
      >
        {setFounder.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span>
            {founder ? 'Retirer le statut fondateur' : 'Marquer fondateur'}
          </span>
        )}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
