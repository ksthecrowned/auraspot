import { describe, expect, test } from 'bun:test';
import { canTransition } from './transitions';

describe('canTransition', () => {
  test('keeps the usual rules for every provider', () => {
    for (const provider of ['mtn_momo', 'airtel_money', 'nyole', 'sandbox']) {
      expect(canTransition(provider, 'pending', 'success')).toBe(true);
      expect(canTransition(provider, 'pending', 'failed')).toBe(true);
      expect(canTransition(provider, 'pending', 'cancelled')).toBe(true);
      expect(canTransition(provider, 'success', 'refunded')).toBe(true);
      expect(canTransition(provider, 'failed', 'success')).toBe(false);
      expect(canTransition(provider, 'success', 'pending')).toBe(false);
      expect(canTransition(provider, 'refunded', 'success')).toBe(false);
    }
  });

  test('credits a Nyole payment paid after we expired it', () => {
    expect(canTransition('nyole', 'cancelled', 'success')).toBe(true);
  });

  test('never revives an expired mobile money payment', () => {
    expect(canTransition('mtn_momo', 'cancelled', 'success')).toBe(false);
    expect(canTransition('airtel_money', 'cancelled', 'success')).toBe(false);
  });

  test('a cancelled Nyole payment cannot fail or be cancelled again', () => {
    expect(canTransition('nyole', 'cancelled', 'failed')).toBe(false);
    expect(canTransition('nyole', 'cancelled', 'refunded')).toBe(false);
  });
});
