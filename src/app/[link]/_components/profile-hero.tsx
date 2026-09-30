'use client';

import { Button } from '@/components/ui/button';
import { formatThousands } from '@/lib/money';
import { type RouterOutputs, api } from '@/trpc/react';
import { AlertTriangle, BarChart3, MapPin, Pencil, Tag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ProfileLinkAvatar from './avatar';
import EditDetailsDialog from './edit-details-dialog';
import PersonalityVerificationBadge from './personality-verification-badge';
import { usePreview } from './preview-context';

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

// The name with its verification badge right after it (a small space only).
function HeroName({
  name,
  onChange,
  verified,
}: {
  name: string;
  // Set when the viewer can edit: the name becomes an input.
  onChange?: (name: string) => void;
  verified: boolean;
}) {
  if (onChange) {
    return (
      <div className="flex max-w-full items-center gap-1">
        {/* field-sizing: the input is as wide as the name, so the badge
            sits right after it. */}
        <input
          aria-label="Nom"
          value={name}
          onChange={(event) => onChange(event.target.value)}
          maxLength={80}
          size={Math.max(name.length, 1)}
          className="min-w-0 max-w-full bg-transparent @4xl:text-left text-center font-bold font-brand @4xl:text-4xl text-3xl leading-tight outline-none [field-sizing:content]"
        />
        {verified && <PersonalityVerificationBadge />}
      </div>
    );
  }
  return (
    <h1 className="max-w-full break-words font-bold font-brand @4xl:text-4xl text-3xl leading-tight">
      {name}
      {/* Inline, so it follows the last word even when the name wraps. */}
      {verified && (
        <span className="ml-1 inline-block align-[-0.1em]">
          <PersonalityVerificationBadge />
        </span>
      )}
    </h1>
  );
}

export default function ProfileHero({
  profileLink: initialData,
}: {
  profileLink: ProfileLinkData;
}) {
  const { link } = useParams<{ link: string }>();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link },
    { initialData, staleTime: 60_000 }
  );
  const { preview } = usePreview();
  const { mutate: updateProfileLink } = api.profileLink.update.useMutation();

  const [name, setName] = useState(initialData.name);
  const lastSavedName = useRef(initialData.name);
  const isEditable = Boolean(profileLink?.canEdit) && !preview;

  useEffect(() => {
    const trimmed = name.trim();
    if (!(isEditable && trimmed) || trimmed === lastSavedName.current) {
      return;
    }
    const timer = setTimeout(() => {
      lastSavedName.current = trimmed;
      updateProfileLink({ id: initialData.id, name: trimmed });
    }, 800);
    return () => clearTimeout(timer);
  }, [isEditable, name, initialData.id, updateProfileLink]);

  if (!profileLink) {
    return null;
  }

  const { category, location, supporters } = profileLink;

  return (
    <section
      data-tour="profile-header"
      className="relative flex flex-col @4xl:items-start items-center gap-4 @4xl:text-left text-center"
    >
      <div
        aria-hidden="true"
        className="aura-halo -z-10 -inset-x-20 -top-28 pointer-events-none absolute h-96"
      />

      {profileLink.status === 'suspended' && profileLink.canEdit && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          Fiche suspendue : elle n’est plus visible du public.
        </p>
      )}

      <ProfileLinkAvatar profileLink={profileLink} />

      <HeroName
        name={isEditable ? name : profileLink.name}
        onChange={isEditable ? setName : undefined}
        verified={profileLink.verificationStatus === 'verified'}
      />

      {(category || location || isEditable) && (
        <div className="flex flex-wrap items-center @4xl:justify-start justify-center gap-2">
          {category && (
            <span className="aura-chip">
              <Tag className="size-3.5" />
              {category.name}
            </span>
          )}
          {location && (
            <span className="aura-chip">
              <MapPin className="size-3.5" />
              {location}
            </span>
          )}
          {isEditable && (
            <EditDetailsDialog
              profileLinkId={profileLink.id}
              categoryId={category?.id ?? null}
              location={location}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-full px-2.5 text-xs"
              >
                <Pencil className="mr-1 size-3.5" />
                {category || location ? 'Modifier' : 'Catégorie et lieu'}
              </Button>
            </EditDetailsDialog>
          )}
        </div>
      )}

      {supporters.count > 0 && (
        <p className="text-muted-foreground text-sm">
          <span className="font-bold font-brand text-foreground text-lg">
            {formatThousands(supporters.count)}
          </span>{' '}
          {supporters.count === 1 ? 'soutien' : 'soutiens'}
        </p>
      )}

      {profileLink.claimStatus === 'unclaimed' && (
        <p className="text-muted-foreground text-xs">
          Fiche non revendiquée · C’est vous ?{' '}
          <Link
            href={`/claim/${profileLink.link}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Revendiquer
          </Link>
        </p>
      )}

      {profileLink.canEdit && profileLink.monthlyViews !== undefined && (
        <Link
          href={`/app/analytics/${profileLink.id}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
        >
          <BarChart3 className="size-3.5" />
          {formatThousands(profileLink.monthlyViews)} visites ce mois · Voir les
          statistiques
        </Link>
      )}
    </section>
  );
}
