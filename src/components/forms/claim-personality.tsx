'use client';

import {
  AURA_ERROR,
  AURA_INPUT,
  AURA_NOTICE,
  AURA_PRIMARY_BUTTON,
  AURA_SECONDARY_BUTTON,
  AURA_TEXTAREA,
  SegmentedControl,
} from '@/components/forms/aura-fields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type RouterOutputs, api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type ClaimContext = NonNullable<RouterOutputs['personality']['claimContext']>;
type Claim = NonNullable<ClaimContext['claim']>;

const STATUS_COPY = {
  PENDING:
    'Votre demande est en attente. Elle ne vous donne pas encore la gestion de la fiche, et elle ne la vérifie pas.',
  APPROVED:
    'Votre demande a été acceptée. La vérification de la fiche reste une décision séparée.',
  REJECTED:
    'Votre dernière demande a été refusée. Vous pouvez en envoyer une nouvelle.',
  MORE_INFORMATION_REQUIRED:
    'La plateforme demande un complément avant de poursuivre l’examen.',
} as const;

const RELATIONSHIP_OPTIONS = [
  { value: 'self', label: 'C’est moi' },
  { value: 'representative', label: 'Je la représente' },
] as const;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function SignedOut({ slug }: { slug: string }) {
  const next = encodeURIComponent(`/claim/${slug}`);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Connectez-vous pour envoyer la demande. Créer un compte ne revendique
        pas la fiche.
      </p>
      <div className="flex flex-col gap-2">
        <Link
          href={`/app/sign-in?redirectUrl=${next}`}
          className={AURA_PRIMARY_BUTTON}
        >
          Se connecter
        </Link>
        <Link
          href={`/app/sign-up?redirectUrl=${next}`}
          className={AURA_SECONDARY_BUTTON}
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}

function ClaimNotice({ claim }: { claim: Claim }) {
  return (
    <div className={AURA_NOTICE}>
      <p>{STATUS_COPY[claim.status]}</p>
      {claim.reviewNote && (
        <p className="mt-2 text-muted-foreground">{claim.reviewNote}</p>
      )}
    </div>
  );
}

function ClaimForm({
  slug,
  claim,
}: {
  slug: string;
  claim: Claim | null;
}) {
  const router = useRouter();
  const submitClaim = api.personality.submitClaim.useMutation();
  const [relationship, setRelationship] = useState<'self' | 'representative'>(
    claim?.relationship ?? 'self'
  );
  const [statement, setStatement] = useState(claim?.statement ?? '');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(
    claim?.evidenceUrls.length ? claim.evidenceUrls : ['']
  );
  const [error, setError] = useState<string | null>(null);

  const updateEvidence = (index: number, value: string) => {
    setEvidenceUrls((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const urls = evidenceUrls.map((item) => item.trim()).filter(Boolean);
    if (statement.trim().length < 20) {
      setError('Décrivez votre lien en au moins 20 caractères.');
      return;
    }
    if (urls.length === 0 || urls.some((url) => !isHttpUrl(url))) {
      setError('Ajoutez au moins un lien http ou https vers un justificatif.');
      return;
    }
    try {
      await submitClaim.mutateAsync({
        slug,
        relationship,
        statement,
        evidenceUrls: urls,
      });
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'La demande n’a pas pu être envoyée.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {claim && <ClaimNotice claim={claim} />}
      <div className="flex flex-col gap-3">
        <span className="font-medium text-sm">Votre lien avec la fiche</span>
        <SegmentedControl
          options={RELATIONSHIP_OPTIONS}
          value={relationship}
          onChange={setRelationship}
        />
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="statement">Explication</Label>
        <textarea
          id="statement"
          value={statement}
          onChange={(event) => setStatement(event.target.value)}
          minLength={20}
          maxLength={1000}
          required
          rows={5}
          placeholder="Expliquez pourquoi vous pouvez gérer cette fiche."
          className={AURA_TEXTAREA}
        />
      </div>
      <div className="flex flex-col gap-3">
        <Label>Justificatifs</Label>
        {evidenceUrls.map((url, index) => (
          <Input
            key={`evidence-${index}`}
            type="url"
            value={url}
            placeholder="https://"
            onChange={(event) => updateEvidence(index, event.target.value)}
            className={AURA_INPUT}
          />
        ))}
        {evidenceUrls.length < 5 && (
          <button
            type="button"
            className="w-fit text-muted-foreground text-sm underline-offset-4 hover:underline"
            onClick={() => setEvidenceUrls((current) => [...current, ''])}
          >
            Ajouter un lien
          </button>
        )}
      </div>
      {error && <p className={AURA_ERROR}>{error}</p>}
      <button
        type="submit"
        disabled={submitClaim.isPending}
        className={AURA_PRIMARY_BUTTON}
      >
        {submitClaim.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          'Envoyer la demande'
        )}
      </button>
    </form>
  );
}

export default function ClaimPersonalityForm({
  context,
}: {
  context: ClaimContext;
}) {
  if (!context.signedIn) {
    return <SignedOut slug={context.personality.slug} />;
  }
  if (context.isManager) {
    return <p className={AURA_NOTICE}>Vous gérez déjà cette fiche.</p>;
  }
  if (
    context.claim &&
    (context.claim.status === 'PENDING' || context.claim.status === 'APPROVED')
  ) {
    return <ClaimNotice claim={context.claim} />;
  }
  return <ClaimForm slug={context.personality.slug} claim={context.claim} />;
}
