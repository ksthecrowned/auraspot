export type CheckoutProvider = {
  id: string;
  start(): { providerReference: string };
};

const sandboxProvider: CheckoutProvider = {
  id: 'sandbox',
  start() {
    return { providerReference: `sandbox_${crypto.randomUUID()}` };
  },
};

export function getCheckoutProvider() {
  return sandboxProvider;
}
