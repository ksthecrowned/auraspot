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
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { useParams } from 'next/navigation';
import { type ReactNode, useState } from 'react';

export default function EditDetailsDialog({
  profileLinkId,
  categoryId,
  location,
  children,
}: {
  profileLinkId: string;
  categoryId: string | null;
  location: string | null;
  children: ReactNode;
}) {
  const { link } = useParams<{ link: string }>();
  const [open, setOpen] = useState(false);
  const [nextCategoryId, setNextCategoryId] = useState(categoryId ?? '');
  const [nextLocation, setNextLocation] = useState(location ?? '');
  const utils = api.useUtils();

  const { data: categories } = api.personality.categories.useQuery(undefined, {
    enabled: open,
  });

  const { mutate, isPending } = api.profileLink.updateDetails.useMutation({
    onSuccess: async () => {
      await utils.profileLink.getByLink.invalidate({ link });
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Enregistrement impossible', description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Catégorie et lieu</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutate({
              id: profileLinkId,
              categoryId: nextCategoryId || null,
              location: nextLocation.trim() || null,
            });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-category">Catégorie</Label>
            <select
              id="profile-category"
              value={nextCategoryId}
              onChange={(event) => setNextCategoryId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Aucune</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-location">Lieu</Label>
            <Input
              id="profile-location"
              value={nextLocation}
              onChange={(event) => setNextLocation(event.target.value)}
              maxLength={80}
              placeholder="Brazzaville"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
