'use client';

import { SocialIcon } from '@/components/icons/social-icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  PLATFORMS,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
  toSocialUrl,
} from '@/lib/social-platforms';
import { api } from '@/trpc/react';
import { LinkBentoSchema } from '@/types';
import { Globe } from 'lucide-react';
import { useParams } from 'next/navigation';
import type React from 'react';
import { type ReactNode, useState } from 'react';
// Every known network except the plain website, which is the default input.
const PRESETS = SOCIAL_PLATFORMS.filter((platform) => platform !== 'website');

export default function CreateLinkBentoModal({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

  const { link } = useParams<{ link: string }>();

  const [selectedPreset, setSelectedPreset] = useState<SocialPlatform | null>(
    null
  );
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const queryClient = api.useContext();

  const { mutateAsync: createBento, isPending } =
    api.profileLink.createBento.useMutation({
      onMutate: (bento) => {
        queryClient.profileLink.getByLink.setData({ link }, (old) => {
          if (!old) {
            return old;
          }
          return {
            ...old,
            bento: [...old.bento, LinkBentoSchema.parse(bento.bento)],
          };
        });
      },
      onSuccess: () => {
        setOpen(false);
        setInput('');
        setSelectedPreset(null);
      },
      onSettled: () => {
        queryClient.profileLink.getByLink.invalidate({ link });
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) {
      return;
    }
    // A network accepts its handle (@name, phone for WhatsApp) or a link.
    const href = selectedPreset
      ? toSocialUrl(selectedPreset, input)
      : toSocialUrl('website', input);
    if (!href) {
      setError(
        selectedPreset
          ? `Ce n’est pas un identifiant ni un lien ${PLATFORMS[selectedPreset].label} valide.`
          : 'Collez un lien complet, qui commence par https://'
      );
      return;
    }
    setError(null);
    createBento({
      link,
      bento: {
        id: crypto.randomUUID(),
        type: 'link',
        href,
      },
    });
  };

  const placeholder = selectedPreset
    ? PLATFORMS[selectedPreset].handleHint
    : 'https://exemple.com';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setInput('');
          setSelectedPreset(null);
          setError(null);
        }
      }}
    >
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cal text-xl">
            Ajouter un lien
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Social presets grid */}
          <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={selectedPreset === preset}
                onClick={() => {
                  setSelectedPreset(selectedPreset === preset ? null : preset);
                  setInput('');
                  setError(null);
                }}
                className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border-2 px-1 py-3 transition-all ${
                  selectedPreset === preset
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
              >
                <SocialIcon platform={preset} size={20} colored />
                <span className="w-full truncate text-center font-medium text-[10px] leading-tight">
                  {PLATFORMS[preset].label}
                </span>
              </button>
            ))}
          </div>

          {/* Custom URL option */}
          {selectedPreset === null && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <div className="h-px flex-1 bg-border" />
              <span>ou collez n’importe quel lien</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          {/* URL input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                {selectedPreset ? (
                  <SocialIcon platform={selectedPreset} size={18} colored />
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Input
                type="text"
                inputMode={selectedPreset === 'whatsapp' ? 'tel' : 'url'}
                aria-label={
                  selectedPreset
                    ? `Identifiant ou lien ${PLATFORMS[selectedPreset].label}`
                    : 'Lien'
                }
                placeholder={placeholder}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                className="rounded-xl"
                autoFocus
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl px-6"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!input || isPending}
                className="rounded-xl px-6"
              >
                {isPending ? 'Ajout…' : 'Ajouter le lien'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
