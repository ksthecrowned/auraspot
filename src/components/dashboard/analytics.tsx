'use client';

import {
  AURA_CARD_CLASS,
  AURA_SECONDARY_BUTTON,
  SegmentedControl,
} from '@/components/forms/aura-fields';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { formatThousands } from '@/lib/money';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import {
  Copy,
  Download,
  Eye,
  Globe,
  Mail,
  Monitor,
  MousePointerClick,
  Percent,
  Share2,
  Users,
} from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

const PERIODS = [
  { value: '7', label: '7 j' },
  { value: '30', label: '30 j' },
  { value: '90', label: '90 j' },
] as const;

type Period = (typeof PERIODS)[number]['value'];

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Ordinateur',
  mobile: 'Mobile',
  tablet: 'Tablette',
  unknown: 'Inconnu',
};

const WWW_RE = /^www\./;
const TRAILING_SLASH_RE = /\/$/;
const COLON_RE = /:/g;

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

function formatFullDate(value: string | Date) {
  return new Date(value).toLocaleDateString('fr-FR');
}

function hostOf(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname.replace(WWW_RE, '') +
      url.pathname.replace(TRAILING_SLASH_RE, '')
    );
  } catch {
    return value;
  }
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <div className={cn(AURA_CARD_CLASS, 'flex flex-col gap-1 p-4 sm:p-5')}>
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="font-bold font-brand text-2xl sm:text-3xl">{value}</span>
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn(AURA_CARD_CLASS, 'flex flex-col gap-4')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold font-brand text-lg">{title}</h2>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-muted-foreground text-sm">{children}</p>
  );
}

function BarList({
  items,
  empty,
}: {
  items: { key: string; label: ReactNode; count: number }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <EmptyLine>{empty}</EmptyLine>;
  }
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatThousands(item.count)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="aura-cta h-full rounded-full transition-all"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrendChart({
  data,
  dataKey,
  label,
  color,
}: {
  data: { date: string; value: number }[];
  dataKey: string;
  label: string;
  color: string;
}) {
  const gradientId = useId().replace(COLON_RE, '');
  const config = { value: { label, color } } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          name={dataKey}
          fill={`url(#${gradientId})`}
          stroke={color}
          strokeWidth={2.5}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[1.25rem]" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-[1.25rem]" />
      <Skeleton className="h-80 rounded-[1.25rem]" />
    </div>
  );
}

function SubscribersPanel({ linkId }: { linkId: string }) {
  const { data: subscribers } = api.profileLink.subscribers.useQuery({
    linkId,
  });
  const count = subscribers?.length ?? 0;

  const copyAll = () => {
    if (!subscribers) {
      return;
    }
    navigator.clipboard
      .writeText(subscribers.map((s) => s.email).join(', '))
      .then(() =>
        toast({
          title: 'Adresses copiées',
          description: `${count} adresse${count > 1 ? 's' : ''} dans le presse-papiers.`,
        })
      )
      .catch(() => undefined);
  };

  const exportCsv = () => {
    if (!subscribers) {
      return;
    }
    const csv = ['Email,Date']
      .concat(
        subscribers.map((s) => `${s.email},${formatFullDate(s.createdAt)}`)
      )
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'abonnes.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      title="Abonnés e-mail"
      description={`${formatThousands(count)} abonné${count > 1 ? 's' : ''}`}
      action={
        count > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyAll}
              className={cn(
                AURA_SECONDARY_BUTTON,
                'w-auto px-3 py-1.5 text-xs'
              )}
            >
              <Copy className="size-3.5" />
              Copier
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className={cn(
                AURA_SECONDARY_BUTTON,
                'w-auto px-3 py-1.5 text-xs'
              )}
            >
              <Download className="size-3.5" />
              CSV
            </button>
          </div>
        )
      }
    >
      {count > 0 && subscribers ? (
        <ul className="flex flex-col gap-2">
          {subscribers.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2"
            >
              <span className="truncate text-sm">{s.email}</span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {formatFullDate(s.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Mail className="size-7 text-muted-foreground/40" />
          <p className="max-w-xs text-muted-foreground text-sm">
            Pas encore d’abonnés. Ajoutez un bloc « Collecte d’e-mails » à votre
            fiche.
          </p>
        </div>
      )}
    </Panel>
  );
}

export default function Analytics({ linkId }: { linkId: string }) {
  const [period, setPeriod] = useState<Period>('30');
  const { data, isLoading } = api.profileLink.analytics.useQuery({
    linkId,
    days: Number(period),
  });

  const periodLabel = `sur ${period} jours`;

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full max-w-[16rem]">
        <SegmentedControl
          options={PERIODS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {isLoading || !data ? (
        isLoading ? (
          <AnalyticsSkeleton />
        ) : null
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatTile
              icon={Eye}
              label="Visites"
              value={formatThousands(data.views)}
            />
            <StatTile
              icon={Users}
              label="Visiteurs uniques"
              value={formatThousands(data.uniqueViews)}
            />
            <StatTile
              icon={MousePointerClick}
              label="Clics sur les blocs"
              value={formatThousands(data.clicks)}
            />
            <StatTile
              icon={Percent}
              label="Taux de clic"
              value={
                data.views > 0
                  ? `${Math.round((data.clicks / data.views) * 100)} %`
                  : '0 %'
              }
            />
            <StatTile
              icon={Share2}
              label="Visites venues des cartes de partage"
              value={formatThousands(data.shareCardViews)}
            />
          </div>

          <Panel title="Visites" description={periodLabel}>
            {data.viewsOverTime.length === 0 ? (
              <EmptyLine>Pas encore de visites sur cette période.</EmptyLine>
            ) : (
              <TrendChart
                label="Visites"
                dataKey="views"
                color="#B43CF0"
                data={data.viewsOverTime.map((v) => ({
                  date: formatDay(v.date),
                  value: v.count,
                }))}
              />
            )}
          </Panel>

          <Panel
            title="Clics"
            description={`Clics sur les blocs ${periodLabel}`}
          >
            {data.clicksOverTime.length === 0 ? (
              <EmptyLine>Pas encore de clics sur cette période.</EmptyLine>
            ) : (
              <TrendChart
                label="Clics"
                dataKey="clicks"
                color="#F75FC0"
                data={data.clicksOverTime.map((c) => ({
                  date: formatDay(c.date),
                  value: c.count,
                }))}
              />
            )}
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Blocs les plus cliqués">
              <BarList
                empty="Pas encore de clics sur cette période."
                items={data.topCards.map((c) => ({
                  key: c.bentoId,
                  label: hostOf(c.href),
                  count: c.count,
                }))}
              />
            </Panel>
            <Panel title="Provenance" description="D’où viennent vos visiteurs">
              <BarList
                empty="Pas encore de provenance connue."
                items={data.topReferrers.map((r) => ({
                  key: r.referrer,
                  label:
                    r.referrer === 'Direct'
                      ? 'Accès direct'
                      : hostOf(r.referrer),
                  count: r.count,
                }))}
              />
            </Panel>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Panel title="Appareils">
              <BarList
                empty="Pas encore de données."
                items={(data.deviceBreakdown?.devices ?? []).map((d) => ({
                  key: d.device,
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Monitor className="size-3.5 text-muted-foreground" />
                      {DEVICE_LABELS[d.device] ?? d.device}
                    </span>
                  ),
                  count: d.count,
                }))}
              />
            </Panel>
            <Panel title="Navigateurs">
              <BarList
                empty="Pas encore de données."
                items={(data.deviceBreakdown?.browsers ?? []).map((b) => ({
                  key: b.browser,
                  label: b.browser,
                  count: b.count,
                }))}
              />
            </Panel>
            <Panel title="Pays">
              <BarList
                empty="Pas encore de données."
                items={(data.geoBreakdown ?? []).map((g) => ({
                  key: g.country,
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Globe className="size-3.5 text-muted-foreground" />
                      {g.country}
                    </span>
                  ),
                  count: g.count,
                }))}
              />
            </Panel>
          </div>
        </>
      )}

      <SubscribersPanel linkId={linkId} />
    </div>
  );
}
