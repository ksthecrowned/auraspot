'use client';

import {
  AURA_ERROR,
  AURA_INPUT,
  AURA_NOTICE,
  AURA_PRIMARY_BUTTON,
  AURA_SECONDARY_BUTTON,
  AURA_TEXTAREA,
} from '@/components/forms/aura-fields';
import { Label } from '@/components/ui/label';
import { MAX_GOAL_AMOUNT, MIN_GOAL_AMOUNT } from '@/lib/support-goal';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export default function GoalManager({
  slug,
  hasGoal,
}: {
  slug: string;
  hasGoal: boolean;
}) {
  const router = useRouter();
  const createGoal = api.personality.createGoal.useMutation();
  const closeGoal = api.personality.closeGoal.useMutation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('100000');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const targetAmount = Number(amount);
    if (
      !Number.isInteger(targetAmount) ||
      targetAmount < MIN_GOAL_AMOUNT ||
      targetAmount > MAX_GOAL_AMOUNT
    ) {
      setError('Le montant cible va de 10 000 à 50 000 000 FCFA.');
      return;
    }
    try {
      await createGoal.mutateAsync({
        slug,
        title,
        description,
        targetAmount,
        endsAt,
      });
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'L’objectif n’a pas pu être créé.'
      );
    }
  };

  if (hasGoal) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={closeGoal.isPending}
          className={AURA_SECONDARY_BUTTON}
          onClick={async () => {
            setError(null);
            try {
              await closeGoal.mutateAsync({ slug });
              router.refresh();
            } catch (submitError) {
              setError(
                submitError instanceof Error
                  ? submitError.message
                  : 'La clôture n’a pas abouti.'
              );
            }
          }}
        >
          {closeGoal.isPending && <Loader2 className="size-4 animate-spin" />}
          Clôturer l’objectif
        </button>
        {error && <p className={AURA_ERROR}>{error}</p>}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={AURA_SECONDARY_BUTTON}
          onClick={() => setOpen(true)}
        >
          Lancer un objectif
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className={AURA_NOTICE}>
        Le montant cible sera visible sur la fiche. Le total collecté, non.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-title">Titre</Label>
        <input
          id="goal-title"
          value={title}
          maxLength={80}
          required
          onChange={(event) => setTitle(event.target.value)}
          className={AURA_INPUT}
        />
      </div>
      <textarea
        value={description}
        maxLength={280}
        placeholder="Description, facultative"
        onChange={(event) => setDescription(event.target.value)}
        className={AURA_TEXTAREA}
      />
      <p className="text-muted-foreground text-xs">
        Les retours à la ligne sont conservés. Entourez un passage de ** pour le
        mettre en gras.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-amount">Montant cible (FCFA)</Label>
        <input
          id="goal-amount"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={AURA_INPUT}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-end">Date de fin, facultative</Label>
        <input
          id="goal-end"
          type="date"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className={AURA_INPUT}
        />
      </div>
      {error && <p className={AURA_ERROR}>{error}</p>}
      <button
        type="submit"
        disabled={createGoal.isPending}
        className={AURA_PRIMARY_BUTTON}
      >
        {createGoal.isPending && <Loader2 className="size-4 animate-spin" />}
        Publier l’objectif
      </button>
    </form>
  );
}
