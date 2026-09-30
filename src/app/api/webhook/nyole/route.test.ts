import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createHmac } from 'node:crypto';

const SECRET = 'af_test_sec_route';
const PAYMENT_ID = '6f1c2b8e-4a53-4c1e-9a0b-2f3d4e5f6a7b';

const syncPayment = mock(
  async (_where: unknown): Promise<string | null> => 'success'
);
mock.module('@/env.mjs', () => ({ env: { NYOLE_SECRET_KEY: SECRET } }));
mock.module('@/server/db/utils/support', () => ({ syncPayment }));

const { POST } = await import('./route');

function signedRequest(body: string) {
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex');
  return new Request('http://localhost/api/webhook/nyole', {
    method: 'POST',
    headers: { 'x-afriflow-signature': `t=${t},v1=${v1}` },
    body,
  });
}

const EVENT = JSON.stringify({
  type: 'payment.completed',
  data: { id: 'cs_1', metadata: { payment_id: PAYMENT_ID } },
});

describe('POST /api/webhook/nyole', () => {
  beforeEach(() => {
    syncPayment.mockReset();
  });

  test('re-checks the payment named in the event', async () => {
    syncPayment.mockResolvedValue('success');
    const res = await POST(signedRequest(EVENT));
    expect(res.status).toBe(200);
    expect(syncPayment).toHaveBeenCalledWith({ paymentId: PAYMENT_ID });
  });

  test('acknowledges an unknown payment', async () => {
    syncPayment.mockResolvedValue(null);
    const res = await POST(signedRequest(EVENT));
    expect(res.status).toBe(200);
  });

  // Nyole retries for 72 h: a failed status read must not be acknowledged,
  // or a late payment would never be credited.
  test('asks Nyole to retry when the status cannot be read', async () => {
    syncPayment.mockRejectedValue(new Error('Statut Nyole indisponible (502)'));
    const res = await POST(signedRequest(EVENT));
    expect(res.status).toBe(503);
  });

  test('rejects an unsigned event without reading anything', async () => {
    const res = await POST(
      new Request('http://localhost/api/webhook/nyole', {
        method: 'POST',
        body: EVENT,
      })
    );
    expect(res.status).toBe(401);
    expect(syncPayment).not.toHaveBeenCalled();
  });
});
