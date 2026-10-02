'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toSocialUrl } from '@/lib/social-platforms';
import { api } from '@/trpc/react';
import { LinkBentoSchema } from '@/types';
import { Globe } from 'lucide-react';
import { useParams } from 'next/navigation';
import type React from 'react';
import { type ReactNode, useState } from 'react';

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
    const href = toSocialUrl('website', input);
    if (!href) {
      setError('Collez un lien complet, qui commence par https://');
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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setInput('');
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="text"
              inputMode="url"
              aria-label="Lien"
              placeholder="https://exemple.com"
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
      </DialogContent>
    </Dialog>
  );
}
