'use client';

import { SocialIcon } from '@/components/icons/social-icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GradientButton } from '@/components/ui/gradient-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROOT_DOMAIN } from '@/lib/site';
import {
  PLATFORMS,
  type SocialPlatform,
  platformsByGroup,
  toSocialUrl,
} from '@/lib/social-platforms';
import Logo from '@/public/logo.png';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

// Networks offered at signup: the social ones, which take a handle. Music
// platforms are added later as their own blocks.
const SIGNUP_PLATFORMS = platformsByGroup('social');

function PreviewCard({
  platform,
  value,
}: {
  platform: SocialPlatform;
  value: string;
}) {
  const spec = PLATFORMS[platform];
  const url = toSocialUrl(platform, value);
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/50 bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <SocialIcon platform={platform} size={16} colored />
        </div>
        <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[9px] text-background">
          {spec.action}
        </span>
      </div>
      <div className="mt-2">
        <p className="truncate font-medium text-[10px]">{spec.label}</p>
        <p className="truncate text-[8px] text-muted-foreground">
          {url ? url.replace('https://', '') : value}
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  const searchParams = useSearchParams();
  const link = searchParams.get('link') ?? '';
  const router = useRouter();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [socials, setSocials] = useState<
    Partial<Record<SocialPlatform, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { mutateAsync: createLink } = api.profileLink.create.useMutation();

  const handleSocialChange = (key: SocialPlatform, value: string) => {
    setSocials((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const filledSocials = SIGNUP_PLATFORMS.flatMap((platform) => {
    const value = socials[platform]?.trim();
    return value ? [{ platform, value }] : [];
  });

  const handlePublish = async () => {
    if (!link || !name) {
      return;
    }
    const invalid = filledSocials.find(
      ({ platform, value }) => !toSocialUrl(platform, value)
    );
    if (invalid) {
      setError(
        `${PLATFORMS[invalid.platform].label} : identifiant ou lien invalide.`
      );
      return;
    }
    setLoading(true);
    try {
      await createLink({
        link,
        name: name || undefined,
        bio: bio || undefined,
        socials: filledSocials,
      });
      router.push(`/${link}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'La page n’a pas pu être créée.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl animate-fade-up overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]">
          {/* Left — Form */}
          <div className="space-y-6 p-8">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Image src={Logo} alt="AuraSpot" width={36} height={36} />
              </Link>
              <div>
                <h1 className="font-cal text-xl">Créez votre page</h1>
                <p className="text-muted-foreground text-xs">
                  {ROOT_DOMAIN}/{link}
                </p>
              </div>
            </div>

            {/* Name + Bio */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-medium text-sm">
                  Nom affiché
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="rounded-xl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="font-medium text-sm">
                  Bio
                </Label>
                <textarea
                  id="bio"
                  rows={2}
                  placeholder="Présentez-vous en quelques mots…"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <Label className="font-medium text-sm">Réseaux sociaux</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SIGNUP_PLATFORMS.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background px-3 py-2.5"
                  >
                    <SocialIcon
                      platform={platform}
                      size={16}
                      className="text-muted-foreground"
                    />
                    <input
                      aria-label={PLATFORMS[platform].label}
                      inputMode={platform === 'whatsapp' ? 'tel' : 'text'}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      placeholder={`${PLATFORMS[platform].label} · ${PLATFORMS[platform].handleHint}`}
                      value={socials[platform] ?? ''}
                      onChange={(e) =>
                        handleSocialChange(platform, e.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Identifiant ou lien. Musique et autres liens s’ajoutent ensuite
                depuis votre page.
              </p>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/claim-link"
                className="text-muted-foreground text-sm hover:text-foreground"
              >
                ← Retour
              </Link>
              <GradientButton
                onClick={() => {
                  handlePublish().catch(console.error);
                }}
                disabled={loading || !name}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création…
                  </>
                ) : (
                  'Créer ma page'
                )}
              </GradientButton>
            </div>
          </div>

          {/* Right — Live Preview (actual profile layout) */}
          <div className="hidden border-border/50 border-l bg-muted/20 lg:block">
            <div className="sticky top-0 p-5">
              <p className="mb-3 font-medium text-[10px] text-muted-foreground uppercase tracking-widest">
                Aperçu
              </p>

              {/* Scaled-down profile preview */}
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-background shadow-sm">
                <div className="p-5">
                  {/* Header — matches actual profile layout */}
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-14 w-14 shadow-sm">
                      <AvatarFallback className="bg-foreground text-background text-lg">
                        {name?.charAt(0)?.toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="mt-2.5 font-cal text-base">
                      {name || 'Votre nom'}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      @{link || 'identifiant'}
                    </p>
                    {bio && (
                      <p className="mt-1.5 line-clamp-2 max-w-55 text-[10px] text-muted-foreground leading-relaxed">
                        {bio}
                      </p>
                    )}
                  </div>

                  {/* Bento grid preview */}
                  {filledSocials.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {filledSocials.map(({ platform, value }) => (
                        <PreviewCard
                          key={platform}
                          platform={platform}
                          value={value}
                        />
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {filledSocials.length === 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex h-20 items-center justify-center rounded-xl border border-border/40 border-dashed bg-muted/30"
                        >
                          <span className="text-[9px] text-muted-foreground/30">
                            Bloc
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 text-center">
                    <span className="text-[8px] text-muted-foreground/50">
                      {ROOT_DOMAIN}/{link || 'identifiant'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
