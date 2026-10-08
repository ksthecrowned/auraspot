import { FichePhoto } from '@/components/admin/fiche-photo';
import { FounderToggle } from '@/components/admin/founder-toggle';
import { PersonalityFicheForm } from '@/components/admin/personality-fiche-form';
import { VerificationToggle } from '@/components/admin/verification-toggle';
import { founderOfferEndsAt } from '@/lib/money';
import { api } from '@/trpc/server';
import { TRPCError } from '@trpc/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminPageMetadata } from '../../access';

type PageProps = {
  params: Promise<{ id: string }>;
};

const UUID_RE = /^[0-9a-f-]{36}$/i;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function generateMetadata() {
  return adminPageMetadata('Modifier la fiche');
}

async function loadFiche(id: string) {
  try {
    return await api.admin.personality({ personalityId: id });
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

export default async function EditPersonalityPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }
  const [fiche, categories] = await Promise.all([
    loadFiche(id),
    api.admin.categories(),
  ]);
  if (!fiche) {
    notFound();
  }

  return (
    <>
      <Link
        href="/admin/personalities"
        className="text-muted-foreground text-sm hover:text-foreground"
      >
        ← Fiches
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-cal text-4xl">{fiche.name}</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {fiche.claimStatus === 'claimed'
              ? 'Revendiquée'
              : 'Non revendiquée'}{' '}
            ·{' '}
            {fiche.verificationStatus === 'verified'
              ? 'Vérifiée'
              : 'Non vérifiée'}{' '}
            ·{' '}
            <Link
              href={`/${fiche.slug}`}
              className="underline underline-offset-4"
            >
              Voir la fiche
            </Link>
          </p>
          {fiche.founderSince && (
            <p className="mt-2 text-muted-foreground text-sm">
              Fondateur depuis le {formatDate(fiche.founderSince)}, 0 % jusqu’au{' '}
              {formatDate(founderOfferEndsAt(fiche.founderSince))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <VerificationToggle
            personalityId={fiche.id}
            verified={fiche.verificationStatus === 'verified'}
          />
          <FounderToggle
            personalityId={fiche.id}
            founder={fiche.founderSince !== null}
          />
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-8">
        <FichePhoto
          personalityId={fiche.id}
          name={fiche.name}
          image={fiche.image}
        />
        <PersonalityFicheForm categories={categories} fiche={fiche} />
      </div>
    </>
  );
}
