// Countries offered in the mobile money phone field (client-safe).
// keepTrunkZero: the leading 0 is part of the number in international format
// (Congo: +242 06 123 45 67). Elsewhere a typed leading 0 is dropped.

export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  example: string;
  keepTrunkZero: boolean;
};

// Congo only for now. To open a country, add it here, add its flag in
// src/components/icons/country-flag.tsx and list it for the operator in
// src/server/payments/mobile-money.ts.
export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    iso: 'CG',
    name: 'Congo',
    dial: '242',
    example: '06 123 45 67',
    keepTrunkZero: true,
  },
];

const NON_DIGIT_RE = /\D/g;
const TRUNK_ZERO_RE = /^0/;
const INTL_PREFIX_RE = /^0{0,2}/;

export function phoneCountry(iso: string) {
  return PHONE_COUNTRIES.find((country) => country.iso === iso);
}

// "06 123 45 67" + CG -> { msisdn: "242061234567", national: "061234567" }.
// Also accepts a number typed with its country code.
export function toMsisdn(iso: string, input: string) {
  const country = phoneCountry(iso);
  if (!country) {
    return null;
  }
  let national = input.replace(NON_DIGIT_RE, '');
  if (
    input.trim().startsWith('+') ||
    national.startsWith(`00${country.dial}`)
  ) {
    national = national.replace(INTL_PREFIX_RE, '');
  }
  if (national.startsWith(country.dial) && national.length > 9) {
    national = national.slice(country.dial.length);
  }
  if (!country.keepTrunkZero) {
    national = national.replace(TRUNK_ZERO_RE, '');
  }
  if (national.length < 7 || national.length > 10) {
    return null;
  }
  return { msisdn: `${country.dial}${national}`, national, country };
}

// Reverse of toMsisdn for a stored "+242061234567". Numbers stored without
// "+" (older records) are Congolese national numbers.
export function fromStoredPhone(phone: string) {
  if (!phone.startsWith('+')) {
    return { iso: 'CG', national: phone };
  }
  const digits = phone.slice(1);
  const country = PHONE_COUNTRIES.find((item) => digits.startsWith(item.dial));
  return country
    ? { iso: country.iso, national: digits.slice(country.dial.length) }
    : null;
}
