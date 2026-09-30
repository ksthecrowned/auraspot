// Adds unclaimed personality fiches, owned by the admin account, until the
// people claim them (/claim/<link>). Only facts we are sure of: name,
// category, city. No photo, bio or social links.
//
// Run: bun --env-file=.env scripts/seed-personalities.ts
// Safe to re-run: existing links are skipped.
import { Client } from 'pg';

const FICHES = [
  {
    link: 'rogaroga',
    name: 'Roga Roga',
    category: 'music',
    location: 'Brazzaville',
  },
  {
    link: 'fredymassamba',
    name: 'Fredy Massamba',
    category: 'music',
    location: 'Brazzaville',
  },
  {
    link: 'kevinmbouande',
    name: 'Kévin Mbouandé',
    category: 'music',
    location: 'Brazzaville',
  },
  {
    link: 'alainmabanckou',
    name: 'Alain Mabanckou',
    category: 'art',
    location: 'Pointe-Noire',
  },
  {
    link: 'rhodemakoumbou',
    name: 'Rhode Makoumbou',
    category: 'art',
    location: 'Brazzaville',
  },
  {
    link: 'princeoniangue',
    name: 'Prince Oniangué',
    category: 'sport',
    location: 'Brazzaville',
  },
  {
    link: 'thievybifouma',
    name: 'Thievy Bifouma',
    category: 'sport',
    location: 'Brazzaville',
  },
];

const ownerEmail = process.env.SEED_OWNER_EMAIL;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const owner = ownerEmail
  ? await client.query('select id from "user" where email = $1', [ownerEmail])
  : await client.query('select id from "user"');
if (owner.rowCount !== 1) {
  throw new Error(
    'Owner not found: set SEED_OWNER_EMAIL to the admin account email.'
  );
}
const ownerId = owner.rows[0].id as string;

await client.query('begin');
try {
  for (const fiche of FICHES) {
    const result = await client.query(
      `insert into link (link, name, user_id, category_id, location,
         claim_status, verification_status, publication_status, is_public)
       select $1, $2, $3, category.id, $5,
         'unclaimed', 'unverified', 'active', true
       from category where category.slug = $4
       on conflict (link) do nothing
       returning link`,
      [fiche.link, fiche.name, ownerId, fiche.category, fiche.location]
    );
    process.stdout.write(
      `${fiche.link}: ${result.rowCount === 1 ? 'created' : 'skipped'}\n`
    );
  }
  await client.query('commit');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
