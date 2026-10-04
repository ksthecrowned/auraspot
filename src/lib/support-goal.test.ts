import { describe, expect, test } from 'bun:test';
import {
  MAX_GOAL_AMOUNT,
  MIN_GOAL_AMOUNT,
  goalDisplayPercent,
} from './support-goal';

describe('goalDisplayPercent', () => {
  test('arrondit à l’unité inférieure', () => {
    expect(goalDisplayPercent(1999, 10_000)).toBe(19);
  });

  test('plafonne l’affichage à 100', () => {
    expect(goalDisplayPercent(80_000, 50_000)).toBe(100);
  });

  test('baisse quand le collecté baisse', () => {
    expect(goalDisplayPercent(5000, 10_000)).toBe(50);
    expect(goalDisplayPercent(0, 10_000)).toBe(0);
  });

  test('reste à 0 si la cible est nulle', () => {
    expect(goalDisplayPercent(1000, 0)).toBe(0);
  });
});

describe('goal amount bounds', () => {
  test('borne le montant cible', () => {
    expect(MIN_GOAL_AMOUNT).toBe(10_000);
    expect(MAX_GOAL_AMOUNT).toBe(50_000_000);
  });
});
