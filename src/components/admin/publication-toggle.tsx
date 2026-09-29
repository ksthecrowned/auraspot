'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PublicationToggle({
  personalityId,
  status,
}: {
  personalityId: string;
  status: 'active' | 'suspended';
}) {
  const router = useRouter();
  const setPublication = api.admin.setPublication.useMutation();
  const [error, setError] = useState<string | null>(null);
  const next = status === 'active' ? 'suspended' : 'active';

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={setPublication.isPending}
        onClick={async () => {
          setError(null);
          try {
            await setPublication.mutateAsync({
              personalityId,
              status: next,
            });
            router.refresh();
          } catch {
            setError('Le statut n’a pas pu être modifié.');
          }
        }}
      >
        {setPublication.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span>{status === 'active' ? 'Suspendre' : 'Republier'}</span>
        )}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
