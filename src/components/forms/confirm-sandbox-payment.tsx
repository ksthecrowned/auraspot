'use client';

import { Button } from '@/components/ui/button';
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
    <Button
      type="button"
      disabled={confirmSandbox.isPending}
      onClick={async () => {
        await confirmSandbox.mutateAsync({ paymentId });
        router.refresh();
      }}
    >
      {confirmSandbox.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        'Simuler le paiement réussi'
      )}
    </Button>
  );
}
