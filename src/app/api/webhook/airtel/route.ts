import { syncMobileMoneyPayment } from '@/server/db/utils/support';

const UUID_RE = /^[0-9a-f-]{36}$/i;

// Airtel Money posts { transaction: { id, status_code, ... } } to the
// callback URL set in the Airtel portal. The payload is only used to know
// which payment to re-check: the status always comes from the Airtel API.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    transaction?: { id?: string };
  } | null;
  const providerReference = body?.transaction?.id;
  if (providerReference && UUID_RE.test(providerReference)) {
    await syncMobileMoneyPayment({ providerReference }).catch(() => null);
  }
  return Response.json({ ok: true });
}
