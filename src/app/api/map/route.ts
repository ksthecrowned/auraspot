import { env } from '@/env.mjs';
import { mapLimit } from '@/lib/ratelimit';
import { type NextRequest, NextResponse } from 'next/server';

// Proxy for Google Static Maps: the API key stays on the server and the
// image is cached, so each place is only billed once per cache period.

const ZOOM = 15;

// Dark, low-detail style that matches the map block design.
const STYLES = [
  'element:geometry|color:0x1d2233',
  'element:labels.text.fill|color:0x8a93b2',
  'element:labels.text.stroke|color:0x1d2233',
  'feature:poi|visibility:off',
  'feature:transit|visibility:off',
  'feature:road|element:geometry|color:0x2c3350',
  'feature:road.highway|element:geometry|color:0x3a4266',
  'feature:road|element:labels.icon|visibility:off',
  'feature:water|element:geometry|color:0x0f1424',
  'feature:landscape.natural|element:geometry|color:0x1f2a2e',
];

function parseCoord(value: string | null, max: number) {
  const n = Number(value);
  if (value === null || !Number.isFinite(n) || Math.abs(n) > max) {
    return null;
  }
  // 4 decimals (~11 m) is enough and keeps the cache small.
  return n.toFixed(4);
}

export async function GET(request: NextRequest) {
  if (!env.GOOGLE_MAPS_API_KEY) {
    return new NextResponse('Map not configured', { status: 503 });
  }

  const lat = parseCoord(request.nextUrl.searchParams.get('lat'), 90);
  const lng = parseCoord(request.nextUrl.searchParams.get('lng'), 180);
  if (!(lat && lng)) {
    return new NextResponse('Invalid coordinates', { status: 400 });
  }

  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0] ??
    'unknown';
  const { success } = await mapLimit.limit(ip);
  if (!success) {
    return new NextResponse('Too many requests', { status: 429 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center', `${lat},${lng}`);
  url.searchParams.set('zoom', String(ZOOM));
  url.searchParams.set('size', '640x640');
  url.searchParams.set('scale', '2');
  url.searchParams.set('format', 'png');
  for (const style of STYLES) {
    url.searchParams.append('style', style);
  }
  url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);

  const res = await fetch(url);
  if (!(res.ok && res.headers.get('content-type')?.startsWith('image/'))) {
    return new NextResponse('Map unavailable', { status: 502 });
  }

  return new NextResponse(res.body, {
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=2592000',
    },
  });
}
