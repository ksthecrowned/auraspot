export const MIN_GOAL_AMOUNT = 10_000;
export const MAX_GOAL_AMOUNT = 50_000_000;

export function goalDisplayPercent(collected: number, target: number) {
  if (target <= 0) {
    return 0;
  }
  const percent = Math.floor((Math.max(0, collected) * 100) / target);
  return Math.min(100, percent);
}
