import type {
  linkClaimStatuses,
  linkVerificationStatuses,
} from '@/server/db/schema/link';

// Donations only reach a fiche its owner has claimed and that the admin has
// verified: no money is collected in the name of someone who never asked.
export function canReceiveSupport(fiche: {
  claimStatus: (typeof linkClaimStatuses)[number];
  verificationStatus: (typeof linkVerificationStatuses)[number];
}) {
  return (
    fiche.claimStatus === 'claimed' && fiche.verificationStatus === 'verified'
  );
}
