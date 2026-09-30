import { describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import {
  nyoleWebhookTarget,
  toPaymentStatus,
  verifyNyoleSignature,
} from './nyole';

const SECRET = 'af_test_sec_unit';
const BODY = '{"type":"payment.completed","data":{"id":"cs_1"}}';
const NOW = 1_790_000_000;

function sign(timestamp: number, body: string, secret = SECRET) {
  const v1 = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return `t=${timestamp},v1=${v1}`;
}

describe('verifyNyoleSignature', () => {
  test('accepts a valid signature', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY,
        header: sign(NOW, BODY),
        nowSeconds: NOW + 10,
      })
    ).toBe(true);
  });

  test('rejects a missing header', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY,
        header: null,
        nowSeconds: NOW,
      })
    ).toBe(false);
  });

  test('rejects another secret', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY,
        header: sign(NOW, BODY, 'af_test_sec_other'),
        nowSeconds: NOW,
      })
    ).toBe(false);
  });

  test('rejects a modified body', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY.replace('cs_1', 'cs_2'),
        header: sign(NOW, BODY),
        nowSeconds: NOW,
      })
    ).toBe(false);
  });

  test('rejects a timestamp older than 5 minutes', () => {
    expect(
      verifyNyoleSignature({
        secret: SECRET,
        rawBody: BODY,
        header: sign(NOW, BODY),
        nowSeconds: NOW + 5 * 60 + 1,
      })
    ).toBe(false);
  });

  test('rejects a malformed header', () => {
    for (const header of ['', 't=,v1=', 'v1=abcd', `t=${NOW}`, 'garbage']) {
      expect(
        verifyNyoleSignature({
          secret: SECRET,
          rawBody: BODY,
          header,
          nowSeconds: NOW,
        })
      ).toBe(false);
    }
  });
});

describe('toPaymentStatus', () => {
  test('maps Nyole statuses', () => {
    expect(toPaymentStatus('PENDING')).toBe('pending');
    expect(toPaymentStatus('SUCCESS')).toBe('success');
    expect(toPaymentStatus('FAILED')).toBe('failed');
    expect(toPaymentStatus('CANCELLED')).toBe('cancelled');
    expect(toPaymentStatus('REFUNDED')).toBe('refunded');
    expect(toPaymentStatus('success')).toBe('success');
  });

  test('treats unknown or missing statuses as pending', () => {
    expect(toPaymentStatus('WHATEVER')).toBe('pending');
    expect(toPaymentStatus(undefined)).toBe('pending');
  });
});

describe('nyoleWebhookTarget', () => {
  const paymentId = '6f1c2b8e-4a53-4c1e-9a0b-2f3d4e5f6a7b';

  test('prefers the payment id from metadata', () => {
    expect(
      nyoleWebhookTarget(
        JSON.stringify({
          type: 'payment.completed',
          data: { id: 'cs_1', metadata: { payment_id: paymentId } },
        })
      )
    ).toEqual({ paymentId });
  });

  test('falls back to the session id', () => {
    expect(nyoleWebhookTarget(BODY)).toEqual({ providerReference: 'cs_1' });
  });

  test('ignores a payment id that is not a uuid', () => {
    expect(
      nyoleWebhookTarget(
        JSON.stringify({ data: { metadata: { payment_id: "1' OR 1=1" } } })
      )
    ).toBeNull();
  });

  test('returns null on invalid JSON or empty payload', () => {
    expect(nyoleWebhookTarget('not json')).toBeNull();
    expect(nyoleWebhookTarget('null')).toBeNull();
    expect(nyoleWebhookTarget('{}')).toBeNull();
  });
});
