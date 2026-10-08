import { describe, expect, test } from 'bun:test';
import { CreateSupportSchema } from './support';

const base = { slug: 'artiste', amount: 50_000 };

describe('CreateSupportSchema amount limit', () => {
  test('accepts 50,000 FCFA', () => {
    expect(CreateSupportSchema.safeParse(base).success).toBe(true);
  });

  test('rejects more than 50,000 FCFA', () => {
    expect(
      CreateSupportSchema.safeParse({ ...base, amount: 50_001 }).success
    ).toBe(false);
  });
});
