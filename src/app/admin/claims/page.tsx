import ClaimReviewList from '@/components/admin/claim-review';
import { api } from '@/trpc/server';
import { adminPageMetadata } from '../access';

export function generateMetadata() {
  return adminPageMetadata('Revendications');
}

export default async function AdminClaimsPage() {
  const claims = await api.admin.claims();

  return (
    <>
      <h1 className="font-cal text-4xl">Revendications</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Accepter donne la gestion de la fiche. Le sceau de vérification se
        décide à part.
      </p>
      {claims.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Aucune demande.</p>
      ) : (
        <div className="mt-8">
          <ClaimReviewList claims={claims} />
        </div>
      )}
    </>
  );
}
