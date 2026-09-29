import Link from 'next/link';
import PersonalityVerificationBadge from './personality-verification-badge';

export default function ProfilePublicMeta({
  slug,
  location,
  verificationStatus,
  isOwner,
}: {
  slug: string;
  location: string | null;
  verificationStatus: 'unverified' | 'verified';
  isOwner: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {verificationStatus === 'verified' && <PersonalityVerificationBadge />}
      {location && <p className="text-muted-foreground text-sm">{location}</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href={`/support/${slug}`}
          className="inline-flex items-center rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
        >
          Soutenir
        </Link>
        {!isOwner && (
          <Link
            href={`/claim/${slug}`}
            className="inline-flex items-center rounded-full border border-border px-4 py-2 font-medium text-sm"
          >
            Revendiquer
          </Link>
        )}
        <Link
          href={`/report/${slug}`}
          className="inline-flex items-center rounded-full border border-border px-4 py-2 font-medium text-sm"
        >
          Signaler
        </Link>
      </div>
    </div>
  );
}
