import { redis, redisConfigured } from '@/lib/redis';
import { Ratelimit } from '@upstash/ratelimit';

const hits = new Map<string, number[]>();

function localLimit(prefix: string, tokens: number): Ratelimit {
  return {
    limit: async (identifier: string) => {
      const now = Date.now();
      const key = `${prefix}:${identifier}`;
      const recent = (hits.get(key) ?? []).filter(
        (time) => now - time < 60_000
      );
      recent.push(now);
      hits.set(key, recent);
      const success = recent.length <= tokens;
      return {
        success,
        limit: tokens,
        remaining: Math.max(tokens - recent.length, 0),
        reset: now + 60_000,
        pending: Promise.resolve(),
      };
    },
  } as unknown as Ratelimit;
}

function createLimit(prefix: string, tokens: number) {
  if (!redisConfigured) {
    return localLimit(prefix, tokens);
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, '1m'),
    prefix,
  });
}

/** General public endpoints — 60 requests per minute */
export const generalLimit = createLimit('rl:general', 60);

/** Email subscribe — 5 requests per minute */
export const subscribeLimit = createLimit('rl:subscribe', 5);

/** Personality claim requests — 5 requests per minute */
export const personalityClaimLimit = createLimit('rl:personality-claim', 5);

/** Personality reports — 5 requests per minute */
export const personalityReportLimit = createLimit('rl:personality-report', 5);

/** Public support checkout — 10 requests per minute */
export const supportCreateLimit = createLimit('rl:support-create', 10);

/** External fetch endpoints (metadata, music) — 10 requests per minute */
export const fetchLimit = createLimit('rl:fetch', 10);
