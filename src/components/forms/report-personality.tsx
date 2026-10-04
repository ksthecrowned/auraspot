'use client';

import {
  AURA_ERROR,
  AURA_NOTICE,
  AURA_SECONDARY_BUTTON,
  AURA_TEXTAREA,
  SegmentedControl,
} from '@/components/forms/aura-fields';
import { Label } from '@/components/ui/label';
import { api } from '@/trpc/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

const REASONS = [
  { value: 'impersonation', label: 'Usurpation' },
  { value: 'inappropriate', label: 'Contenu' },
  { value: 'other', label: 'Autre' },
] as const;

export default function ReportPersonalityForm({
  slug,
  supportId,
}: {
  slug: string;
  supportId?: string;
}) {
  const report = api.personality.report.useMutation();
  const [reason, setReason] = useState<
    (typeof REASONS)[number]['value'] | 'inappropriate_message'
  >(supportId ? 'inappropriate_message' : 'impersonation');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (details.trim().length < 10) {
      setError('Décrivez le problème en au moins 10 caractères.');
      return;
    }
    try {
      await report.mutateAsync({
        slug,
        reason,
        details,
        supportId: reason === 'inappropriate_message' ? supportId : undefined,
      });
      setSent(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Le signalement n’a pas pu être envoyé.'
      );
    }
  };

  if (sent) {
    return (
      <p className={`${AURA_NOTICE} flex items-center gap-2`}>
        <CheckCircle2 className="size-4 shrink-0" />
        Le signalement est enregistré. Il sera examiné avant toute décision.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="font-medium text-sm">Motif</span>
        {supportId ? (
          <p className={AURA_NOTICE}>Message inapproprié</p>
        ) : (
          <SegmentedControl
            options={REASONS}
            value={reason === 'inappropriate_message' ? 'other' : reason}
            onChange={setReason}
          />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="details">Détails</Label>
        <textarea
          id="details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={2000}
          required
          placeholder="Expliquez ce qui pose problème."
          className={AURA_TEXTAREA}
        />
      </div>
      {error && <p className={AURA_ERROR}>{error}</p>}
      <button
        type="submit"
        disabled={report.isPending}
        className={AURA_SECONDARY_BUTTON}
      >
        {report.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          'Envoyer le signalement'
        )}
      </button>
    </form>
  );
}
