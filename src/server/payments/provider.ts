export type CheckoutProvider = {
  id: string;
  start(): { providerReference: string };
};

// Every checkout starts here: "sandbox" means no operator chosen yet. The
// payer then picks MTN MoMo or Airtel Money (see mobile-money.ts).
const sandboxProvider: CheckoutProvider = {
  id: 'sandbox',
  start() {
    return { providerReference: `sandbox_${crypto.randomUUID()}` };
  },
};

export function getCheckoutProvider() {
  return sandboxProvider;
}
