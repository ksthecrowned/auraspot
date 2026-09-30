import { env } from '@/env.mjs';
import { syncPayment } from '@/server/db/utils/support';
import {
  nyoleWebhookTarget,
  verifyNyoleSignature,
} from '@/server/payments/nyole';

// Nyole signs every event (X-Afriflow-Signature). The payload only says which
// payment to re-check: the status always comes from the Nyole API. Unknown
// payments get 200 so Nyole stops retrying; a failed status read gets 503 so
// Nyole retries (72 h) instead of losing a late payment.
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
    try {
      await syncPayment(target);
    } catch {
      return Response.json({ error: 'retry' }, { status: 503 });
    }
  }
  return Response.json({ ok: true });
}
