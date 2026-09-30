'use client';

import {
  AURA_PRIMARY_BUTTON,
  AURA_SECONDARY_BUTTON,
} from '@/components/forms/aura-fields';
import { usePaymentPolling } from '@/hooks/use-payment-polling';
import Link from 'next/link';

// Nyole session open: back from Nyole (paid or not) or page reopened. The
// status refreshes by itself; the payer can resume or start over.
export default function NyolePending({
  paymentId,
  resumeUrl,
  retryHref,
}: {
  paymentId: string;
  resumeUrl: string;
  retryHref: string;
}) {
  usePaymentPolling(paymentId, true);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-muted-foreground text-sm">
        Si vous avez déjà payé, cette page se met à jour toute seule.
      </p>
      <a href={resumeUrl} className={AURA_PRIMARY_BUTTON}>
        Reprendre le paiement sur Nyole
      </a>
      <Link href={retryHref} className={AURA_SECONDARY_BUTTON}>
        Faire un nouveau don
      </Link>
    </div>
  );
}
