import { timingSafeEqual } from 'node:crypto';
import { env } from '@/env.mjs';
import { PaymentWebhookSchema } from '@/server/api/schemas/support';
import { applyPaymentEvent } from '@/server/db/utils/support';

function authorized(request: Request) {
  const secret = env.PAYMENTS_WEBHOOK_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || !header?.startsWith('Bearer ')) {
    return false;
  }
  const provided = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = PaymentWebhookSchema.safeParse(await request.json());
  if (!body.success) {
    return Response.json({ error: 'invalid' }, { status: 400 });
  }
  const result = await applyPaymentEvent(body.data);
  if ('error' in result) {
    const status = result.error === 'not-found' ? 404 : 409;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, duplicate: result.duplicate });
}
