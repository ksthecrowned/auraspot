import { describe, expect, test } from 'bun:test';
import {
  type BalanceEntry,
  commissionBpsFor,
  founderOfferEndsAt,
  withdrawableBalance,
} from './money';

const now = new Date('2026-01-15T12:00:00.000Z');

function entry(
  overrides: Partial<BalanceEntry> & Pick<BalanceEntry, 'entryType' | 'amount'>
): BalanceEntry {
  return {
    createdAt: now,
    paymentId: null,
    held: false,
    ...overrides,
  };
}

describe('withdrawableBalance', () => {
  test('makes direct Mobile Money credits available immediately', () => {
    const balance = withdrawableBalance(
      [entry({ entryType: 'credit', amount: 1000 })],
      0,
      now,
      14
    );

    expect(balance).toEqual({ available: 1000, held: 0, nextReleaseAt: null });
  });

  test('holds Nyole credits until 14 days after their ledger entry', () => {
    const balance = withdrawableBalance(
      [
        entry({
          entryType: 'credit',
          amount: 1000,
          createdAt: new Date('2026-01-02T12:00:00.000Z'),
          paymentId: 'nyole-payment',
          held: true,
        }),
      ],
      0,
      now,
      14
    );

    expect(balance.available).toBe(0);
    expect(balance.held).toBe(1000);
    expect(balance.nextReleaseAt).toEqual(new Date('2026-01-16T12:00:00.000Z'));
  });

  test('releases a Nyole credit at 14 days', () => {
    const balance = withdrawableBalance(
      [
        entry({
          entryType: 'credit',
          amount: 1000,
          createdAt: new Date('2026-01-01T12:00:00.000Z'),
          paymentId: 'nyole-payment',
          held: true,
        }),
      ],
      0,
      now,
      14
    );

    expect(balance).toEqual({ available: 1000, held: 0, nextReleaseAt: null });
  });

  test('does not count a refunded credit as held twice', () => {
    const balance = withdrawableBalance(
      [
        entry({
          entryType: 'credit',
          amount: 1000,
          createdAt: new Date('2026-01-14T12:00:00.000Z'),
          paymentId: 'refunded-payment',
          held: true,
        }),
        entry({
          entryType: 'debit',
          amount: 1000,
          paymentId: 'refunded-payment',
        }),
      ],
      0,
      now,
      14
    );

    expect(balance).toEqual({ available: 0, held: 0, nextReleaseAt: null });
  });

  test('subtracts fees, withdrawals, and reservations', () => {
    const balance = withdrawableBalance(
      [
        entry({ entryType: 'credit', amount: 5000 }),
        entry({ entryType: 'fee', amount: 500 }),
        entry({ entryType: 'withdrawal', amount: 1000 }),
      ],
      1500,
      now,
      14
    );

    expect(balance.available).toBe(2000);
  });

  test('never returns a negative available balance', () => {
    const balance = withdrawableBalance(
      [entry({ entryType: 'debit', amount: 1000 })],
      500,
      now,
      14
    );

    expect(balance.available).toBe(0);
  });

  test('returns the nearest release date among held credits', () => {
    const balance = withdrawableBalance(
      [
        entry({
          entryType: 'credit',
          amount: 100,
          createdAt: new Date('2026-01-10T12:00:00.000Z'),
          paymentId: 'later',
          held: true,
        }),
        entry({
          entryType: 'credit',
          amount: 100,
          createdAt: new Date('2026-01-12T12:00:00.000Z'),
          paymentId: 'sooner',
          held: true,
        }),
      ],
      0,
      now,
      14
    );

    expect(balance.nextReleaseAt).toEqual(new Date('2026-01-24T12:00:00.000Z'));
  });
});

describe('founderOfferEndsAt', () => {
  test('adds six UTC calendar months', () => {
    expect(founderOfferEndsAt(new Date('2026-10-06T10:30:00.000Z'))).toEqual(
      new Date('2027-04-06T10:30:00.000Z')
    );
  });

  test('uses the last day when the target month is shorter', () => {
    expect(founderOfferEndsAt(new Date('2026-08-31T10:30:00.000Z'))).toEqual(
      new Date('2027-02-28T10:30:00.000Z')
    );
  });
});

describe('commissionBpsFor', () => {
  test('uses the default commission for non-founders', () => {
    expect(commissionBpsFor(null, now, 1000)).toBe(1000);
  });

  test('waives commission during the founder offer', () => {
    expect(
      commissionBpsFor(new Date('2025-12-01T12:00:00.000Z'), now, 1000)
    ).toBe(0);
  });

  test('restores the default commission on the offer end date', () => {
    const founderSince = new Date('2025-07-15T12:00:00.000Z');
    expect(
      commissionBpsFor(founderSince, founderOfferEndsAt(founderSince), 1000)
    ).toBe(1000);
  });
});
