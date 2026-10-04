import PersonalityPageShell from '@/components/personality-page-shell';
import { auth } from '@/lib/auth';
import { db } from '@/server/db/db';
import { isProfileLinkEditor } from '@/server/db/utils/link';
import {
  DEDICATION_PAGE_SIZE,
  getSupportPage,
  listVisibleDedications,
} from '@/server/db/utils/support';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import MessageList from './message-list';

type PageProps = {
  params: Promise<{ link: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pageNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { link } = await params;
  const personality = await getSupportPage(link);
  return {
    title: personality ? `Messages pour ${personality.name}` : 'Messages',
    robots: { index: false, follow: false },
  };
}

export default async function MessagesPage({
  params,
  searchParams,
}: PageProps) {
  const { link } = await params;
  const query = await searchParams;
  const personality = await getSupportPage(link);
  if (!personality) {
    notFound();
  }
  const page = pageNumber(query.page);
  const session = await auth.api.getSession({ headers: await headers() });
  const owner = session
    ? await db.query.link.findFirst({
        where: (table, { eq: equals }) => equals(table.id, personality.id),
        columns: { userId: true },
      })
    : null;
  const [dedications, canEdit] = await Promise.all([
    listVisibleDedications(personality.id, { page }),
    session
      ? isProfileLinkEditor(session.user.id, {
          id: personality.id,
          userId: owner?.userId ?? '',
        })
      : Promise.resolve(false),
  ]);

  return (
    <PersonalityPageShell
      slug={personality.slug}
      title={`Messages pour ${personality.name}`}
      subtitle={
        dedications.total > 0
          ? `${dedications.total} message${dedications.total > 1 ? 's' : ''}`
          : undefined
      }
    >
      <MessageList
        slug={personality.slug}
        items={dedications.items}
        total={dedications.total}
        page={page}
        pageSize={DEDICATION_PAGE_SIZE}
        canEdit={canEdit}
      />
    </PersonalityPageShell>
  );
}
