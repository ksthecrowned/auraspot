import { describe, expect, test } from 'bun:test';
import { ReviewWithdrawalSchema } from './admin';
import { RequestWithdrawalSchema } from './support';

const ID = '6f1c2b8e-4a53-4c1e-9a0b-2f3d4e5f6a7b';

describe('RequestWithdrawalSchema', () => {
  const base = {
    slug: 'kaiserstyve',
    grossAmount: 5000,
    payoutOperator: 'mtn_momo',
    payoutCountry: 'CG',
    payoutPhone: '06 123 45 67',
  };

  test('needs an operator and a number to pay', () => {
    expect(RequestWithdrawalSchema.safeParse(base).success).toBe(true);
    expect(
      RequestWithdrawalSchema.safeParse({ ...base, payoutOperator: undefined })
        .success
    ).toBe(false);
    expect(
      RequestWithdrawalSchema.safeParse({ ...base, payoutPhone: '' }).success
    ).toBe(false);
  });

  test('only mobile money operators', () => {
    expect(
      RequestWithdrawalSchema.safeParse({ ...base, payoutOperator: 'nyole' })
        .success
    ).toBe(false);
  });
});

describe('ReviewWithdrawalSchema', () => {
  test('marking paid needs the transfer reference', () => {
    expect(
      ReviewWithdrawalSchema.safeParse({ withdrawalId: ID, decision: 'paid' })
        .success
    ).toBe(false);
    expect(
      ReviewWithdrawalSchema.safeParse({
        withdrawalId: ID,
        decision: 'paid',
        reference: 'MP240930.1234.A56789',
      }).success
    ).toBe(true);
  });

  test('refusing needs a reason', () => {
    expect(
      ReviewWithdrawalSchema.safeParse({
        withdrawalId: ID,
        decision: 'refused',
        note: 'non',
      }).success
    ).toBe(false);
    expect(
      ReviewWithdrawalSchema.safeParse({
        withdrawalId: ID,
        decision: 'refused',
        note: 'Numéro au nom d’une autre personne.',
      }).success
    ).toBe(true);
  });
});
