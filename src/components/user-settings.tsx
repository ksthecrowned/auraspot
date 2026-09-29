import EmailDigestToggle from '@/components/email-digest-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    <div className="flex w-full flex-col gap-y-6">
      <div className="flex flex-col gap-y-6 rounded-lg border border-border bg-background px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-2">
          <Label>Your Avatar</Label>

          <Avatar>
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="uppercase">
              {user.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-2">
          <Label>Your Email</Label>

          <Input value={user.email} readOnly className="w-max" />
        </div>

        <div className="space-y-2">
          <Label>Your Name</Label>

          <Input value={user.name} readOnly className="w-max" />
        </div>

        <div className="space-y-2">
          <EmailDigestToggle defaultEnabled={user.emailDigest} />
        </div>
      </div>
    </div>
  );
}
