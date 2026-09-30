'use client';

import { AURA_PRIMARY_BUTTON } from '@/components/forms/aura-fields';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ConfirmSandboxPayment({
  paymentId,
}: {
  paymentId: string;
}) {
  const router = useRouter();
  const confirmSandbox = api.support.confirmSandbox.useMutation();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={AURA_PRIMARY_BUTTON}
        disabled={confirmSandbox.isPending}
        onClick={async () => {
          await confirmSandbox.mutateAsync({ paymentId });
          router.refresh();
        }}
      >
        {confirmSandbox.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          'Simuler le paiement réussi'
        )}
      </button>
      <p className="text-center text-muted-foreground text-xs">
        Mode test : aucun argent n’est débité.
      </p>
    </div>
  );
}
