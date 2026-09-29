import { env } from '@/env.mjs';
import { neon } from '@neondatabase/serverless';
import {
  type NeonHttpDatabase,
  drizzle as drizzleNeon,
} from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const isLocalDatabase =
  env.DATABASE_URL.includes('@localhost') ||
  env.DATABASE_URL.includes('@127.0.0.1');

// Local Postgres speaks the wire protocol. Neon HTTP does not.
export const db: NeonHttpDatabase<typeof schema> = isLocalDatabase
  ? (drizzleNode(new Pool({ connectionString: env.DATABASE_URL }), {
      schema,
    }) as unknown as NeonHttpDatabase<typeof schema>)
  : drizzleNeon(neon(env.DATABASE_URL), { schema });
