'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { useState } from 'react';

export default function EmailDigestToggle({
  defaultEnabled,
}: {
  defaultEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  const { mutate } = api.user.updateEmailDigest.useMutation({
    onSuccess: (data) => {
      setEnabled(data.emailDigest);
      toast({
        title: data.emailDigest ? 'Résumé activé' : 'Résumé désactivé',
        description: data.emailDigest
          ? 'Vous recevrez chaque semaine un résumé de vos statistiques.'
          : 'Vous ne recevrez plus le résumé hebdomadaire.',
      });
    },
  });

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor="email-digest">Résumé hebdomadaire</Label>
        <p className="text-muted-foreground text-xs">
          Chaque semaine, un e-mail avec les visites, les clics et les abonnés
          de vos fiches.
        </p>
      </div>
      <Switch
        id="email-digest"
        checked={enabled}
        onCheckedChange={(checked) => mutate({ enabled: checked })}
      />
    </div>
  );
}
