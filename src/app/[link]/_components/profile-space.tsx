'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { firstNameOf } from '@/lib/personality';
import { type RouterOutputs, api } from '@/trpc/react';
import { LayoutGrid } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import Bento from './bento';
import { usePreview } from './preview-context';

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

export default function ProfileSpace({
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

  if (!profileLink) {
    return null;
  }

  const isEditable = profileLink.canEdit && !preview;
  const isEmpty = profileLink.bento.length === 0;

  if (isEmpty && !isEditable) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        Espace de {firstNameOf(profileLink.name)}
      </h2>
      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-border border-dashed px-6 py-10 text-center text-muted-foreground text-sm">
          <LayoutGrid className="size-5" />
          Ajoutez votre premier bloc : vidéo, musique, compte à rebours…
          <span className="text-xs">
            Utilisez le bouton + de la barre d’outils.
          </span>
        </div>
      ) : (
        <div className="aura-space">
          <Suspense
            fallback={
              <div className="grid @4xl:grid-cols-4 grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="aspect-square rounded-[1.25rem]"
                  />
                ))}
              </div>
            }
          >
            <Bento profileLink={profileLink} />
          </Suspense>
        </div>
      )}
    </section>
  );
}
