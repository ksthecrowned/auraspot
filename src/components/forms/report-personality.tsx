'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

const REASONS = [
  { value: 'impersonation', label: 'Usurpation' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'other', label: 'Autre' },
] as const;

export default function ReportPersonalityForm({ slug }: { slug: string }) {
  const report = api.personality.report.useMutation();
  const [reason, setReason] =
    useState<(typeof REASONS)[number]['value']>('impersonation');
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
      await report.mutateAsync({ slug, reason, details });
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
      <p className="mt-8 text-sm">
        Le signalement est enregistré. Il sera examiné avant toute décision.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-sm">Motif</legend>
        {REASONS.map((item) => (
          <label key={item.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reason"
              checked={reason === item.value}
              onChange={() => setReason(item.value)}
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details">Détails</Label>
        <textarea
          id="details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={2000}
          required
          className="min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={report.isPending}>
        {report.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Envoyer'
        )}
      </Button>
    </form>
  );
}
