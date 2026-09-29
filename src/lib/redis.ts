import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? '';

const memoryRedis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
};

export const redisConfigured =
  redisUrl.startsWith('https://') && redisToken.length > 0;

export const redis = redisConfigured
  ? new Redis({ url: redisUrl, token: redisToken })
  : (memoryRedis as unknown as Redis);
