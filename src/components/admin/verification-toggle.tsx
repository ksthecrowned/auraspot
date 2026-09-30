'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// The verification seal. Donations also need the fiche to be claimed, so
// verifying an unclaimed fiche does not open donations on its own.
export function VerificationToggle({
  personalityId,
  verified,
}: {
  personalityId: string;
  verified: boolean;
}) {
  const router = useRouter();
  const setVerification = api.admin.setVerification.useMutation();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={setVerification.isPending}
        onClick={async () => {
          setError(null);
          try {
            await setVerification.mutateAsync({
              personalityId,
              verified: !verified,
            });
            router.refresh();
          } catch {
            setError('Le sceau n’a pas pu être modifié.');
          }
        }}
      >
        {setVerification.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span>{verified ? 'Retirer la vérification' : 'Vérifier'}</span>
        )}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
