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
import { toast } from '@/components/ui/use-toast';
import {
  PERSONALITY_PLATFORMS,
  type PersonalityPlatform,
  platformLabel,
} from '@/lib/personality';
import { api } from '@/trpc/react';
import { Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { type ReactNode, useState } from 'react';

type Row = { key: number; platform: PersonalityPlatform; value: string };

function isPlatform(value: string): value is PersonalityPlatform {
  return (PERSONALITY_PLATFORMS as readonly string[]).includes(value);
}

export default function EditSocialsDialog({
  profileLinkId,
  socialLinks,
  children,
}: {
  profileLinkId: string;
  socialLinks: { platform: string; url: string }[];
  children: ReactNode;
}) {
  const { link } = useParams<{ link: string }>();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    socialLinks.map((item, index) => ({
      key: index,
      platform: isPlatform(item.platform) ? item.platform : 'website',
      value: item.url,
    }))
  );

  const { mutate, isPending } = api.profileLink.setSocialLinks.useMutation({
    onSuccess: async () => {
      await utils.profileLink.getByLink.invalidate({ link });
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Enregistrement impossible', description: error.message });
    },
  });

  const update = (key: number, patch: Partial<Omit<Row, 'key'>>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réseaux officiels</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutate({
              id: profileLinkId,
              links: rows
                .filter((row) => row.value.trim())
                .map(({ platform, value }) => ({ platform, value })),
            });
          }}
        >
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <select
                aria-label="Plateforme"
                value={row.platform}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isPlatform(value)) {
                    update(row.key, { platform: value });
                  }
                }}
                className="h-10 w-32 shrink-0 rounded-md border border-input bg-background px-2 text-sm"
              >
                {PERSONALITY_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platformLabel(platform)}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Identifiant ou lien"
                value={row.value}
                onChange={(event) =>
                  update(row.key, { value: event.target.value })
                }
                placeholder="@identifiant ou https://…"
                maxLength={200}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() =>
                  setRows((current) =>
                    current.filter((item) => item.key !== row.key)
                  )
                }
                title="Retirer"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {rows.length < 12 && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { key: Date.now(), platform: 'instagram', value: '' },
                ])
              }
            >
              <Plus className="mr-2 size-4" />
              Ajouter un réseau
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
