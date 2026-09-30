import { env } from '@/env.mjs';
import { runRecurringRenewals } from '@/server/db/utils/recurring';
import { type NextRequest, NextResponse } from 'next/server';

// Daily: requests the monthly payments that are due and closes abandoned
// ones (see src/server/db/utils/recurring.ts).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runRecurringRenewals();
  return NextResponse.json({ ok: true, ...result });
}
