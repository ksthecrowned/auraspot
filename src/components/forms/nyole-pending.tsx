'use client';

import {
  AURA_ERROR,
  AURA_PRIMARY_BUTTON,
  AURA_SECONDARY_BUTTON,
} from '@/components/forms/aura-fields';
import { usePaymentPolling } from '@/hooks/use-payment-polling';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Nyole chosen. "resume": back from Nyole (paid or not) or page reopened; the
// status refreshes by itself. "retry": the session could not be created
// (Nyole refused or did not answer); the payer can try again.
export default function NyolePending({
  paymentId,
  action,
  retryHref,
}: {
  paymentId: string;
  action: { kind: 'resume'; url: string } | { kind: 'retry' };
  retryHref: string;
}) {
  usePaymentPolling(paymentId, action.kind === 'resume');
  const payWithNyole = api.support.payWithNyole.useMutation();
  const [redirecting, setRedirecting] = useState(false);
  const busy = payWithNyole.isPending || redirecting;

  return (
    <div className="flex flex-col gap-2">
      {action.kind === 'resume' ? (
        <>
          <p className="text-center text-muted-foreground text-sm">
            Si vous avez déjà payé, cette page se met à jour toute seule.
          </p>
          <a href={action.url} className={AURA_PRIMARY_BUTTON}>
            Reprendre le paiement sur Nyole
          </a>
        </>
      ) : (
        <>
          <p className="text-center text-muted-foreground text-sm">
            La page de paiement Nyole n’a pas pu s’ouvrir.
          </p>
          {payWithNyole.error && (
            <p className={AURA_ERROR}>{payWithNyole.error.message}</p>
          )}
          <button
            type="button"
            className={AURA_PRIMARY_BUTTON}
            disabled={busy}
            onClick={async () => {
              const result = await payWithNyole
                .mutateAsync({ paymentId })
                .catch(() => null);
              if (result) {
                setRedirecting(true);
                window.location.assign(result.url);
              }
            }}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Réessayer avec Nyole'
            )}
          </button>
        </>
      )}
      <Link href={retryHref} className={AURA_SECONDARY_BUTTON}>
        Faire un nouveau don
      </Link>
    </div>
  );
}
