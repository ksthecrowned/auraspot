'use client';

import { Button } from '@/components/ui/button';
import { type RouterOutputs, api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Report = RouterOutputs['admin']['reports'][number];

const REASON_LABEL = {
  impersonation: 'Usurpation',
  inappropriate: 'Contenu inapproprié',
  other: 'Autre',
} as const;

export function ReportReviewList({ reports }: { reports: Report[] }) {
  return (
    <ul className="mt-8 flex flex-col gap-4">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </ul>
  );
}

function ReportCard({ report }: { report: Report }) {
  const router = useRouter();
  const reviewReport = api.admin.reviewReport.useMutation();
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: 'dismissed' | 'suspend') => {
    setError(null);
    try {
      await reviewReport.mutateAsync({ reportId: report.id, decision });
      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'La décision n’a pas pu être enregistrée.'
      );
    }
  };

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/${report.personality.slug}`} className="font-medium">
            {report.personality.name}
          </Link>
          <p className="mt-1 text-muted-foreground text-sm">
            {REASON_LABEL[report.reason]}
            {report.personality.status === 'suspended'
              ? ' · Déjà suspendue'
              : ''}
          </p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{report.details}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={reviewReport.isPending}
          onClick={() => decide('dismissed')}
        >
          Classer
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={reviewReport.isPending}
          onClick={() => decide('suspend')}
        >
          {reviewReport.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Suspendre la fiche'
          )}
        </Button>
      </div>
      {error && <p className="mt-2 text-destructive text-sm">{error}</p>}
    </li>
  );
}
