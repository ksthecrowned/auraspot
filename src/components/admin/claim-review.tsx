'use client';

import { Button } from '@/components/ui/button';
import { type RouterOutputs, api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Claim = RouterOutputs['admin']['claims'][number];
type Decision = 'APPROVED' | 'REJECTED' | 'MORE_INFORMATION_REQUIRED';

const STATUS_LABEL = {
  PENDING: 'En attente',
  APPROVED: 'Acceptée',
  REJECTED: 'Refusée',
  MORE_INFORMATION_REQUIRED: 'Complément demandé',
} as const;

const RELATIONSHIP_LABEL = {
  self: 'La personne elle-même',
  representative: 'Représentant',
} as const;

function ClaimCard({ claim }: { claim: Claim }) {
  const router = useRouter();
  const reviewClaim = api.admin.reviewClaim.useMutation();
  const setVerification = api.admin.setVerification.useMutation();
  const [note, setNote] = useState(claim.reviewNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const open =
    claim.status === 'PENDING' || claim.status === 'MORE_INFORMATION_REQUIRED';
  const verified = claim.personality?.verificationStatus === 'verified';

  const decide = async (decision: Decision) => {
    setError(null);
    if (decision !== 'APPROVED' && note.trim().length < 10) {
      setError('Expliquez la décision en au moins 10 caractères.');
      return;
    }
    try {
      await reviewClaim.mutateAsync({
        claimId: claim.id,
        decision,
        reviewNote: note.trim(),
      });
      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'La décision n’a pas pu être enregistrée.'
      );
    }
  };

  const toggleVerification = async () => {
    if (!claim.personality) {
      return;
    }
    setError(null);
    try {
      await setVerification.mutateAsync({
        personalityId: claim.personality.id,
        verified: !verified,
      });
      router.refresh();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : 'La vérification n’a pas pu être enregistrée.'
      );
    }
  };

  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-cal text-2xl">
            {claim.personality?.name ?? 'Fiche supprimée'}
          </h2>
          {claim.personality && (
            <Link
              href={`/${claim.personality.slug}`}
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              /{claim.personality.slug}
            </Link>
          )}
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs">
          {STATUS_LABEL[claim.status]}
        </span>
      </div>
      <p className="mt-3 text-sm">
        {claim.user?.name ?? 'Compte supprimé'}
        {claim.user?.email ? ` · ${claim.user.email}` : ''}
      </p>
      <p className="text-muted-foreground text-sm">
        {RELATIONSHIP_LABEL[claim.relationship]}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm">{claim.statement}</p>
      {claim.evidenceUrls.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {claim.evidenceUrls.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline-offset-4 hover:underline"
              >
                {url}
              </a>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          Note pour le demandeur
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={1000}
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
      )}
      {claim.reviewNote && !open && (
        <p className="mt-3 text-muted-foreground text-sm">{claim.reviewNote}</p>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {open && (
          <>
            <Button
              type="button"
              disabled={reviewClaim.isPending}
              onClick={() => decide('APPROVED')}
            >
              {reviewClaim.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Accepter'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={reviewClaim.isPending}
              onClick={() => decide('MORE_INFORMATION_REQUIRED')}
            >
              Demander un complément
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={reviewClaim.isPending}
              onClick={() => decide('REJECTED')}
            >
              Refuser
            </Button>
          </>
        )}
        {claim.personality && (
          <Button
            type="button"
            variant="outline"
            disabled={setVerification.isPending}
            onClick={toggleVerification}
          >
            {verified ? 'Retirer la vérification' : 'Vérifier la fiche'}
          </Button>
        )}
      </div>
    </article>
  );
}

export default function ClaimReviewList({ claims }: { claims: Claim[] }) {
  return (
    <div className="flex flex-col gap-4">
      {claims.map((claim) => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
    </div>
  );
}
