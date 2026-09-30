import { AuraAvatar } from '@/components/aura-avatar';
import EmailDigestToggle from '@/components/email-digest-toggle';
import { AURA_INPUT } from '@/components/forms/aura-fields';
import { AURA_CARD_CLASS } from '@/components/forms/aura-fields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/auth';
import type { RouterOutputs } from '@/trpc/react';
import { headers } from 'next/headers';

export default async function UserSettings({
  user,
}: {
  user: NonNullable<RouterOutputs['user']['me']>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className={`${AURA_CARD_CLASS} flex max-w-xl flex-col gap-6`}>
      <div className="flex items-center gap-4">
        <AuraAvatar
          name={user.name}
          image={session?.user?.image ?? null}
          className="size-16"
        />
        <div className="min-w-0">
          <p className="truncate font-bold font-brand text-lg">{user.name}</p>
          <p className="truncate text-muted-foreground text-sm">{user.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="settings-name">Nom</Label>
        <Input
          id="settings-name"
          value={user.name}
          readOnly
          className={AURA_INPUT}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="settings-email">E-mail</Label>
        <Input
          id="settings-email"
          value={user.email}
          readOnly
          className={AURA_INPUT}
        />
      </div>

      <EmailDigestToggle defaultEnabled={user.emailDigest} />
    </div>
  );
}
