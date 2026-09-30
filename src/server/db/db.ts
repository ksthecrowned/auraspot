import { env } from '@/env.mjs';
import { neon } from '@neondatabase/serverless';
import {
  type NeonHttpDatabase,
  drizzle as drizzleNeon,
} from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const isNeonDatabase = env.DATABASE_URL.includes('.neon.tech');

// Neon HTTP only works against Neon. Any other Postgres (local, alwaysdata…)
// speaks the wire protocol.
export const db: NeonHttpDatabase<typeof schema> = isNeonDatabase
  ? drizzleNeon(neon(env.DATABASE_URL), { schema })
  : (drizzleNode(new Pool({ connectionString: env.DATABASE_URL }), {
      schema,
    }) as unknown as NeonHttpDatabase<typeof schema>);
