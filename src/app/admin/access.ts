import { isAdminEmail } from '@/lib/admin';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

export async function adminPageMetadata(title: string): Promise<Metadata> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdminEmail(session?.user.email)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  return { title, robots: { index: false, follow: false } };
}

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdminEmail(session?.user.email)) {
    notFound();
  }
}
