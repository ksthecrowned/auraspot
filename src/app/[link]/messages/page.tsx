import PersonalityPageShell from '@/components/personality-page-shell';
import {
  DEDICATION_PAGE_SIZE,
  getSupportPage,
  listVisibleDedications,
} from '@/server/db/utils/support';
import type { Metadata } from 'next';
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
  const dedications = await listVisibleDedications(personality.id, { page });

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
      />
    </PersonalityPageShell>
  );
}
