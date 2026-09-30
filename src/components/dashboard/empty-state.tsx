import { AuraOrb } from '@/components/brand';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.25rem] border border-border border-dashed px-6 py-14 text-center">
      <AuraOrb className="size-14" />
      <h3 className="font-bold font-brand text-xl">
        Aucune fiche pour l’instant
      </h3>
      <p className="max-w-xs text-muted-foreground text-sm">
        Créez la page d’une personnalité : la vôtre ou celle que vous
        représentez.
      </p>
      <Link
        href="/claim-link"
        className="aura-cta mt-3 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 font-brand font-semibold text-sm transition-transform hover:scale-[1.03]"
      >
        <Plus className="size-4" />
        Créer une page
      </Link>
    </div>
  );
}
