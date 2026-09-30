// Creates an MTN MoMo sandbox API user and API key (sandbox only; production
// credentials come from the MoMo partner portal).
//
//   MOMO_COLLECTION_SUBSCRIPTION_KEY=xxx bun run scripts/momo-sandbox-user.ts [callback-host]
//
// Prints MOMO_API_USER and MOMO_API_KEY to copy into .env.

const baseUrl =
  process.env.MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com';
const subscriptionKey = process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY;
const callbackHost = process.argv[2] ?? 'localhost';

if (!subscriptionKey) {
  console.error('MOMO_COLLECTION_SUBSCRIPTION_KEY is missing');
  process.exit(1);
}

const apiUser = crypto.randomUUID();

const created = await fetch(`${baseUrl}/v1_0/apiuser`, {
  method: 'POST',
  headers: {
    'X-Reference-Id': apiUser,
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ providerCallbackHost: callbackHost }),
});
if (created.status !== 201) {
  console.error(
    'API user creation failed',
    created.status,
    await created.text()
  );
  process.exit(1);
}

const keyRes = await fetch(`${baseUrl}/v1_0/apiuser/${apiUser}/apikey`, {
  method: 'POST',
  headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey },
});
if (keyRes.status !== 201) {
  console.error('API key creation failed', keyRes.status, await keyRes.text());
  process.exit(1);
}
const { apiKey } = (await keyRes.json()) as { apiKey: string };

console.log(`MOMO_API_USER=${apiUser}`);
console.log(`MOMO_API_KEY=${apiKey}`);

export {};
