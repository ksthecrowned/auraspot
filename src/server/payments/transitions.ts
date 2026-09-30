import { NYOLE_PROVIDER, type PaymentStatus } from './nyole';

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['success', 'failed', 'cancelled'],
  success: ['refunded'],
  failed: [],
  cancelled: [],
  refunded: [],
};

// A Nyole session cannot be cancelled through the API: after we expire a
// stale payment the payer can still pay it. That money is real, so it is
// credited. Mobile money requests expire at the operator, so they cannot.
export function canTransition(
  provider: string,
  from: PaymentStatus,
  to: PaymentStatus
) {
  if (PAYMENT_TRANSITIONS[from].includes(to)) {
    return true;
  }
  return (
    provider === NYOLE_PROVIDER && from === 'cancelled' && to === 'success'
  );
}
