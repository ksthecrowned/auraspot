import { syncPayment } from '@/server/db/utils/support';

const UUID_RE = /^[0-9a-f-]{36}$/i;

// MTN MoMo calls X-Callback-Url (PUT) when a request to pay is final. The
// body is not signed, so it is only used to know which payment to re-check:
// the status always comes from the MoMo API.
async function handle(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    externalId?: string;
  } | null;
  const paymentId = body?.externalId;
  if (paymentId && UUID_RE.test(paymentId)) {
    await syncPayment({ paymentId }).catch(() => null);
  }
  return Response.json({ ok: true });
}

export { handle as POST, handle as PUT };
