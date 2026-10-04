import { shareCardHeadline, shareCardSizes } from '@/lib/share-card';
import { ROOT_DOMAIN } from '@/lib/site';
import { db } from '@/server/db/db';
import { getGoalSnapshot } from '@/server/db/utils/support-goal';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: Request,
  context: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await context.params;
  if (!UUID_RE.test(paymentId)) {
    return new Response('Not found', { status: 404 });
  }

  const row = await db.query.payment.findFirst({
    where: (table, { eq: equals }) => equals(table.id, paymentId),
    columns: { status: true },
    with: {
      support: {
        columns: { isPublic: true, displayName: true, goalId: true },
        with: {
          personality: {
            columns: { name: true, link: true, image: true, status: true },
          },
        },
      },
    },
  });
  const personality = row?.support?.personality;
  if (!row || row.status !== 'success' || !personality) {
    return new Response('Not found', { status: 404 });
  }
  if (personality.status === 'suspended') {
    return new Response('Not found', { status: 404 });
  }

  const headline = shareCardHeadline({
    isPublic: row.support.isPublic,
    displayName: row.support.displayName,
    personalityName: personality.name,
  });
  const goal = row.support.goalId
    ? await getGoalSnapshot(row.support.goalId)
    : null;
  const format = new URL(req.url).searchParams.get('format');
  const { width, height } = shareCardSizes(format);
  const portrait = height > width;

  const [calSans, inter] = await Promise.all([
    fetch(new URL('/fonts/CalSans-SemiBold.ttf', req.url)).then((res) =>
      res.arrayBuffer()
    ),
    fetch(new URL('/fonts/Inter-Regular.ttf', req.url)).then((res) =>
      res.arrayBuffer()
    ),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(160deg, #1a1028 0%, #3a1468 55%, #f75fc0 140%)',
        color: 'white',
        padding: portrait ? 80 : 64,
        fontFamily: 'Inter',
      }}
    >
      <div
        style={{
          display: 'flex',
          padding: 8,
          borderRadius: 999,
          background: 'linear-gradient(135deg, #F75FC0, #B43CF0, #5B6CFF)',
        }}
      >
        {personality.image ? (
          <img
            src={personality.image}
            alt=""
            width={portrait ? 280 : 160}
            height={portrait ? 280 : 160}
            style={{ borderRadius: 999, objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: portrait ? 280 : 160,
              height: portrait ? 280 : 160,
              borderRadius: 999,
              background: '#120818',
            }}
          />
        )}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 48,
          fontFamily: 'Cal Sans',
          fontSize: portrait ? 72 : 56,
          textAlign: 'center',
          lineHeight: 1.15,
        }}
      >
        {headline}
      </div>
      {goal && (
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: portrait ? 32 : 24,
            opacity: 0.9,
          }}
        >
          {`${goal.title} · ${goal.percent} %`}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          marginTop: portrait ? 80 : 40,
          fontSize: portrait ? 36 : 28,
          opacity: 0.85,
        }}
      >
        {`${ROOT_DOMAIN}/${personality.link}`}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 16,
          fontFamily: 'Cal Sans',
          fontSize: portrait ? 42 : 32,
        }}
      >
        AuraSpot
      </div>
    </div>,
    {
      width,
      height,
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
      fonts: [
        { data: calSans, name: 'Cal Sans', style: 'normal', weight: 600 },
        { data: inter, name: 'Inter', style: 'normal', weight: 400 },
      ],
    }
  );
}
