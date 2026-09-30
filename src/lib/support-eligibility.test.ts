import { describe, expect, test } from 'bun:test';
import { canReceiveSupport } from './support-eligibility';

describe('canReceiveSupport', () => {
  test('a claimed and verified fiche can receive donations', () => {
    expect(
      canReceiveSupport({
        claimStatus: 'claimed',
        verificationStatus: 'verified',
      })
    ).toBe(true);
  });

  test('an unclaimed fiche cannot, even if verified', () => {
    expect(
      canReceiveSupport({
        claimStatus: 'unclaimed',
        verificationStatus: 'verified',
      })
    ).toBe(false);
  });

  test('a claimed fiche cannot until it is verified', () => {
    expect(
      canReceiveSupport({
        claimStatus: 'claimed',
        verificationStatus: 'unverified',
      })
    ).toBe(false);
  });

  test('an unclaimed, unverified fiche cannot', () => {
    expect(
      canReceiveSupport({
        claimStatus: 'unclaimed',
        verificationStatus: 'unverified',
      })
    ).toBe(false);
  });
});
