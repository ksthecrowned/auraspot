import { env } from '@/env.mjs';
import { syncPayment } from '@/server/db/utils/support';
import {
  nyoleWebhookTarget,
  verifyNyoleSignature,
} from '@/server/payments/nyole';

// Nyole signs every event (X-Afriflow-Signature). The payload only says which
// payment to re-check: the status always comes from the Nyole API. Answer 200
// even for unknown payments so Nyole stops retrying.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = env.NYOLE_SECRET_KEY;
  const valid =
    !!secret &&
    verifyNyoleSignature({
      secret,
      rawBody,
      header: request.headers.get('x-afriflow-signature'),
      nowSeconds: Math.floor(Date.now() / 1000),
    });
  if (!valid) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const target = nyoleWebhookTarget(rawBody);
  if (target) {
    await syncPayment(target).catch(() => null);
  }
  return Response.json({ ok: true });
}
