'use client';

import { AURA_TEXTAREA } from '@/components/forms/aura-fields';
import { Switch } from '@/components/ui/switch';
import { DEDICATION_MAX_LENGTH } from '@/lib/dedication';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

export function SupportPrivacyToggle({
  supportId,
  isPublic,
}: {
  supportId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const setVisibility = api.support.setVisibility.useMutation();
  const [checked, setChecked] = useState(isPublic);

  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Switch
        id={id}
        checked={checked}
        disabled={setVisibility.isPending}
        onCheckedChange={async (next) => {
          setChecked(next);
          try {
            await setVisibility.mutateAsync({ supportId, isPublic: next });
            router.refresh();
          } catch {
            setChecked(!next);
          }
        }}
      />
      Afficher mon nom
      {setVisibility.isPending && <Loader2 className="size-3 animate-spin" />}
    </label>
  );
}

export function SupportMessageEditor({
  supportId,
  message,
}: {
  supportId: string;
  message: string | null;
}) {
  const router = useRouter();
  const edit = api.support.editMessage.useMutation();
  const [value, setValue] = useState(message ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        maxLength={DEDICATION_MAX_LENGTH}
        placeholder="Votre message, facultatif"
        onChange={(event) => setValue(event.target.value)}
        className={AURA_TEXTAREA}
      />
      <button
        type="button"
        disabled={edit.isPending}
        className="inline-flex items-center gap-1.5 self-start font-medium text-sm underline-offset-4 hover:underline disabled:opacity-50"
        onClick={async () => {
          setError(null);
          try {
            await edit.mutateAsync({ supportId, message: value });
            router.refresh();
          } catch (submitError) {
            setError(
              submitError instanceof Error
                ? submitError.message
                : 'Le message n’a pas pu être enregistré.'
            );
          }
        }}
      >
        {edit.isPending && <Loader2 className="size-3.5 animate-spin" />}
        {value.trim() ? 'Enregistrer le message' : 'Retirer le message'}
      </button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

export function CancelRecurringButton({
  recurringSupportId,
}: {
  recurringSupportId: string;
}) {
  const router = useRouter();
  const cancel = api.support.cancelRecurring.useMutation();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={cancel.isPending}
        className="inline-flex items-center gap-1.5 font-medium text-destructive text-sm underline-offset-4 hover:underline disabled:opacity-50"
        onClick={async () => {
          setError(null);
          try {
            await cancel.mutateAsync({ recurringSupportId });
            router.refresh();
          } catch {
            setError('L’arrêt n’a pas abouti.');
          }
        }}
      >
        {cancel.isPending && <Loader2 className="size-3.5 animate-spin" />}
        Arrêter le don mensuel
      </button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
