import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { migrate as migrateNode } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '../../env.mjs';

const migrationsFolder = 'src/server/db/drizzle';

// Neon HTTP only works against Neon. Any other Postgres speaks the wire protocol.
const main = async () => {
  if (env.DATABASE_URL.includes('.neon.tech')) {
    await migrateNeon(drizzleNeon(neon(env.DATABASE_URL)), {
      migrationsFolder,
    });
  } else {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    await migrateNode(drizzleNode(pool), { migrationsFolder });
    await pool.end();
  }

  process.exit(0);
};

main().catch((_e) => {
  process.exit(1);
});
