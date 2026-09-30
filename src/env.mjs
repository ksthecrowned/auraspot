import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_PUBLIC_BASE_URL: z.string().url().optional(),
    GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    VERCEL_PROJECT_ID: z.string().min(1).optional(),
    VERCEL_TEAM_ID: z.string().min(1).optional(),
    VERCEL_TOKEN: z.string().min(1).optional(),
    ADMIN_EMAILS: z.string().optional(),
    SUPPORT_COMMISSION_BPS: z.coerce
      .number()
      .int()
      .min(0)
      .max(5_000)
      .default(1000),
    PAYMENTS_WEBHOOK_SECRET: z.string().min(16).optional(),
  },
  client: {
    NEXT_PUBLIC_URL: z.string(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || undefined,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || undefined,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || undefined,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || undefined,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL || undefined,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || undefined,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY || undefined,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID || undefined,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || undefined,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN || undefined,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS || undefined,
    SUPPORT_COMMISSION_BPS: process.env.SUPPORT_COMMISSION_BPS || undefined,
    PAYMENTS_WEBHOOK_SECRET: process.env.PAYMENTS_WEBHOOK_SECRET || undefined,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
