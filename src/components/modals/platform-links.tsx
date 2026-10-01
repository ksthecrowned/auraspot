'use client';

import { SocialIcon } from '@/components/icons/social-icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PLATFORMS,
  type PlatformSyncAction,
  type SocialGroup,
  type SocialPlatform,
  planPlatformLinkSync,
  platformsByGroup,
  socialPlatformOf,
} from '@/lib/social-platforms';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const GROUP_PLATFORMS = {
  social: platformsByGroup('social'),
  music: platformsByGroup('music'),
};

const COPY: Record<'social' | 'music', { title: string; description: string }> =
  {
    social: {
      title: 'Réseaux sociaux',
      description:
        'Identifiant ou lien. Un champ vide retire le bloc de cette plateforme.',
    },
    music: {
      title: 'Plateformes de musique',
      description:
        'Lien du profil ou du titre. Un champ vide retire le bloc de cette plateforme.',
    },
  };

function seedValues(
  bento: { type: string; href?: string | null }[] | undefined,
  platforms: readonly SocialPlatform[]
) {
  const allowed = new Set<SocialPlatform>(platforms);
  const values: Partial<Record<SocialPlatform, string>> = {};
  for (const card of bento ?? []) {
    if (card.type !== 'link' || !card.href) {
      continue;
    }
    const platform = socialPlatformOf(card.href);
    if (platform && allowed.has(platform) && values[platform] === undefined) {
      values[platform] = card.href;
    }
  }
  return values;
}

export default function PlatformLinksModal({
  group,
  open,
  onOpenChange,
}: {
  group: Extract<SocialGroup, 'social' | 'music'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { link } = useParams<{ link: string }>();
  const platforms = GROUP_PLATFORMS[group];
  const copy = COPY[group];

  const { data: profileLink } = api.profileLink.getByLink.useQuery({ link });
  const cardsRef = useRef(profileLink?.bento);
  const seeded = useRef(false);

  const [values, setValues] = useState<Partial<Record<SocialPlatform, string>>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const queryClient = api.useContext();
  const { mutateAsync: createBento } =
    api.profileLink.createBento.useMutation();
  const { mutateAsync: updateBento } =
    api.profileLink.updateBento.useMutation();
  const { mutateAsync: deleteBento } =
    api.profileLink.deleteBento.useMutation();

  useEffect(() => {
    if (!open) {
      seeded.current = false;
      return;
    }
    if (!profileLink || seeded.current) {
      return;
    }
    seeded.current = true;
    cardsRef.current = profileLink.bento;
    setValues(seedValues(profileLink.bento, platforms));
    setError(null);
  }, [open, platforms, profileLink]);

  const applyAction = async (action: PlatformSyncAction) => {
    if (action.kind === 'create') {
      await createBento({
        link,
        bento: {
          id: crypto.randomUUID(),
          type: 'link',
          href: action.href,
        },
      });
      return;
    }
    if (action.kind === 'delete') {
      await deleteBento({ link, id: action.id });
      return;
    }
    const card = cardsRef.current?.find((item) => item.id === action.id);
    if (card?.type === 'link') {
      await updateBento({
        link,
        bento: { ...card, href: action.href },
      });
    }
  };

  const handleSave = async () => {
    const existing = (cardsRef.current ?? []).flatMap((card) =>
      card.type === 'link' ? [{ id: card.id, href: card.href }] : []
    );
    const plan = planPlatformLinkSync(platforms, values, existing);
    if (!plan.ok) {
      setError(
        `${PLATFORMS[plan.platform].label} : identifiant ou lien invalide.`
      );
      return;
    }
    if (plan.actions.length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      for (const action of plan.actions) {
        await applyAction(action);
      }
      await queryClient.profileLink.getByLink.invalidate({ link });
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Les blocs n’ont pas pu être enregistrés.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-cal text-xl">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {platforms.map((platform) => (
            <label
              key={platform}
              className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background px-3 py-2.5"
            >
              <SocialIcon platform={platform} size={16} colored />
              <input
                aria-label={PLATFORMS[platform].label}
                inputMode={platform === 'whatsapp' ? 'tel' : 'text'}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={`${PLATFORMS[platform].label} · ${PLATFORMS[platform].handleHint}`}
                value={values[platform] ?? ''}
                onChange={(event) => {
                  setValues((prev) => ({
                    ...prev,
                    [platform]: event.target.value,
                  }));
                  setError(null);
                }}
              />
            </label>
          ))}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl px-6"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="rounded-xl px-6"
            disabled={saving || !profileLink}
            onClick={() => {
              handleSave().catch(console.error);
            }}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
