'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  PERSONALITY_PLATFORMS,
  PLATFORM_LABELS,
  type PersonalityPlatform,
  slugifyPersonalityName,
} from '@/lib/personality';
import { ROOT_DOMAIN } from '@/lib/site';
import { type RouterOutputs, api } from '@/trpc/react';
import { Loader2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type Category = RouterOutputs['admin']['categories'][number];
type Fiche = RouterOutputs['admin']['personality'];
type SocialRow = { key: number; platform: PersonalityPlatform; value: string };

const FIELD_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

let nextKey = 0;
function socialRow(platform: PersonalityPlatform, value = ''): SocialRow {
  nextKey += 1;
  return { key: nextKey, platform, value };
}

// Create or edit a fiche. The address is chosen once, at creation: changing
// it later would break shared links and QR codes.
export function PersonalityFicheForm({
  categories,
  fiche,
}: {
  categories: Category[];
  fiche?: Fiche;
}) {
  const router = useRouter();
  const createPersonality = api.admin.createPersonality.useMutation();
  const updatePersonality = api.admin.updatePersonality.useMutation();
  const pending = createPersonality.isPending || updatePersonality.isPending;

  const [name, setName] = useState(fiche?.name ?? '');
  const [slug, setSlug] = useState(fiche?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(fiche));
  const [categoryId, setCategoryId] = useState(fiche?.categoryId ?? '');
  const [location, setLocation] = useState(fiche?.location ?? '');
  const [bio, setBio] = useState(fiche?.bio ?? '');
  const [bioEdited, setBioEdited] = useState(false);
  const [isPublic, setIsPublic] = useState(fiche?.isPublic ?? true);
  const [socials, setSocials] = useState<SocialRow[]>(
    () =>
      fiche?.socialLinks.flatMap((item) =>
        (PERSONALITY_PLATFORMS as readonly string[]).includes(item.platform)
          ? [socialRow(item.platform as PersonalityPlatform, item.url)]
          : []
      ) ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const usedPlatforms = new Set(socials.map((row) => row.platform));
  const freePlatform = PERSONALITY_PLATFORMS.find(
    (platform) => !usedPlatforms.has(platform)
  );

  const submitLabel = fiche ? 'Enregistrer' : 'Créer la fiche';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const fields = {
      name,
      categoryId: categoryId || null,
      location,
      isPublic,
      socialLinks: socials.map(({ platform, value }) => ({ platform, value })),
      ...(fiche && !bioEdited ? {} : { bio }),
    };
    try {
      if (fiche) {
        await updatePersonality.mutateAsync({
          personalityId: fiche.id,
          ...fields,
        });
        setSaved(true);
        setBioEdited(false);
        router.refresh();
      } else {
        const created = await createPersonality.mutateAsync({
          slug,
          ...fields,
        });
        // The photo is added on the edit page, once the fiche exists.
        router.push(`/admin/personalities/${created.id}`);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'La fiche n’a pas pu être enregistrée.'
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fiche-name">Nom</Label>
        <Input
          id="fiche-name"
          value={name}
          required
          minLength={2}
          maxLength={80}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugEdited) {
              setSlug(slugifyPersonalityName(event.target.value));
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fiche-slug">Adresse</Label>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">{ROOT_DOMAIN}/</span>
          <Input
            id="fiche-slug"
            value={slug}
            disabled={Boolean(fiche)}
            required
            minLength={3}
            maxLength={50}
            pattern="[a-z0-9-]+"
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value.toLowerCase());
            }}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          {fiche
            ? 'L’adresse ne change pas : les liens et QR codes partagés resteraient cassés.'
            : 'Lettres minuscules, chiffres et tirets. Elle ne pourra plus changer.'}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fiche-category">Catégorie</Label>
          <select
            id="fiche-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Aucune</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="fiche-location">Ville</Label>
          <Input
            id="fiche-location"
            value={location}
            maxLength={80}
            placeholder="Brazzaville"
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fiche-bio">Bio</Label>
        <textarea
          id="fiche-bio"
          value={bio}
          maxLength={1000}
          rows={4}
          onChange={(event) => {
            setBio(event.target.value);
            setBioEdited(true);
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {fiche && (
          <p className="text-muted-foreground text-xs">
            Texte simple. La mise en forme du propriétaire n’est remplacée que
            si vous modifiez la bio.
          </p>
        )}
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 font-medium text-sm">Réseaux officiels</legend>
        {socials.map((row, index) => (
          <div key={row.key} className="flex gap-2">
            <select
              aria-label="Réseau"
              value={row.platform}
              onChange={(event) =>
                setSocials((current) =>
                  current.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          platform: event.target.value as PersonalityPlatform,
                        }
                      : item
                  )
                )
              }
              className={`${FIELD_CLASS} w-36 shrink-0`}
            >
              {PERSONALITY_PLATFORMS.map((platform) => (
                <option
                  key={platform}
                  value={platform}
                  disabled={
                    platform !== row.platform && usedPlatforms.has(platform)
                  }
                >
                  {PLATFORM_LABELS[platform]}
                </option>
              ))}
            </select>
            <Input
              aria-label={`Lien ${PLATFORM_LABELS[row.platform]}`}
              value={row.value}
              placeholder={
                row.platform === 'website'
                  ? 'https://…'
                  : '@identifiant ou lien'
              }
              onChange={(event) =>
                setSocials((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, value: event.target.value } : item
                  )
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Retirer ce réseau"
              onClick={() =>
                setSocials((current) => current.filter((_, i) => i !== index))
              }
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {freePlatform && (
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() =>
              setSocials((current) => [...current, socialRow(freePlatform)])
            }
          >
            <Plus className="mr-1 size-4" />
            Ajouter un réseau
          </Button>
        )}
      </fieldset>

      <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
        <div>
          <Label htmlFor="fiche-public">Fiche publique</Label>
          <p className="text-muted-foreground text-xs">
            Visible dans la découverte et à son adresse.
          </p>
        </div>
        <Switch
          id="fiche-public"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {saved && <p className="text-sm">Fiche enregistrée.</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
}
