import { env } from '@/env.mjs';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

// File storage on Cloudflare R2 (S3-compatible API), same setup as ride-api.
// Objects are served publicly from R2_PUBLIC_BASE_URL (r2.dev or custom domain).

let client: S3Client | undefined;

function getClient() {
  if (client) {
    return client;
  }
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env;
  if (!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY)) {
    throw new Error('R2 configuration is missing');
  }
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

function getBucket() {
  if (!env.R2_BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME is missing');
  }
  return env.R2_BUCKET_NAME;
}

function getPublicBase() {
  if (!env.R2_PUBLIC_BASE_URL) {
    throw new Error('R2_PUBLIC_BASE_URL is missing');
  }
  return env.R2_PUBLIC_BASE_URL.replace(/\/$/, '');
}

// Keys are always built server-side: `<prefix>/<yyyy-mm-dd>/<uuid>.<ext>`.
export function buildObjectKey(prefix: string, ext: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `${prefix}/${day}/${crypto.randomUUID()}.${ext}`;
}

export async function uploadObject({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return { key, url: `${getPublicBase()}/${key}` };
}

// Only deletes objects of our bucket under `allowedPrefix`; anything else
// (legacy Vercel Blob URLs, external images) is ignored.
export async function deleteObjectByUrl(url: string, allowedPrefix: string) {
  const base = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!(base && url.startsWith(`${base}/`))) {
    return false;
  }
  const key = url.slice(base.length + 1);
  if (key.includes('..') || !key.startsWith(`${allowedPrefix}/`)) {
    return false;
  }
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
  );
  return true;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

// Returns an error message, or null when the file can be processed.
export function validateImageFile(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return 'Fichier manquant';
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Formats acceptés : JPG, PNG, WEBP, GIF ou AVIF';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image trop lourde (10 Mo maximum)';
  }
  return null;
}
