// Checks the MTN MoMo sandbox credentials end to end, without touching the
// database: token, request to pay on a test number, then status polling.
//
//   bun run scripts/momo-sandbox-check.ts [msisdn]
//
// Any regular number (e.g. 06 123 45 67) succeeds in the sandbox; the
// special MoMo test numbers (4673312345x) return failure/pending cases.

import { toMsisdn } from '@/lib/phone-countries';
import {
  getProviderStatus,
  requestToPay,
} from '@/server/payments/mobile-money';

const phone = process.argv[2] ?? '061234567';
const reference = crypto.randomUUID();
// Sandbox test numbers (4673312345x) are sent as typed.
const parsed = phone.startsWith('4673') ? null : toMsisdn('CG', phone);
const payer = parsed
  ? { iso: 'CG', msisdn: parsed.msisdn, national: parsed.national }
  : { iso: 'CG', msisdn: phone, national: phone };

await requestToPay('mtn_momo', {
  reference,
  externalId: reference,
  amount: 100,
  payer,
});
console.info(`request sent (reference ${reference}, number ${phone})`);

for (let attempt = 1; attempt <= 10; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const status = await getProviderStatus('mtn_momo', reference);
  console.info(`status #${attempt}: ${status}`);
  if (status !== 'pending') {
    break;
  }
}
