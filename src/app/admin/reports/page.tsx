import { ReportReviewList } from '@/components/admin/report-review';
import { api } from '@/trpc/server';
import { adminPageMetadata } from '../access';

export function generateMetadata() {
  return adminPageMetadata('Signalements');
}

export default async function AdminReportsPage() {
  const reports = await api.admin.reports();

  return (
    <>
      <h1 className="font-cal text-4xl">Signalements</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Classer laisse la fiche publique. Suspendre la retire de la découverte
        et de son adresse publique.
      </p>
      {reports.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Aucun signalement ouvert.</p>
      ) : (
        <ReportReviewList reports={reports} />
      )}
    </>
  );
}
