'use client';

import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const POLL_MS = 3000;

// While a payment is pending, asks the server to re-read its status and
// refreshes the page once it is final.
export function usePaymentPolling(paymentId: string, enabled: boolean) {
  const router = useRouter();
  const { mutateAsync: syncStatus } = api.support.syncCheckout.useMutation();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let stopped = false;
    const timer = setInterval(async () => {
      const result = await syncStatus({ paymentId }).catch(() => null);
      if (!stopped && result && result.status !== 'pending') {
        stopped = true;
        clearInterval(timer);
        router.refresh();
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [enabled, paymentId, syncStatus, router]);
}
