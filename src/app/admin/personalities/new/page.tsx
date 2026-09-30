import { PersonalityFicheForm } from '@/components/admin/personality-fiche-form';
import { api } from '@/trpc/server';
import Link from 'next/link';
import { adminPageMetadata } from '../../access';

export function generateMetadata() {
  return adminPageMetadata('Nouvelle fiche');
}

export default async function NewPersonalityPage() {
  const categories = await api.admin.categories();

  return (
    <>
      <Link
        href="/admin/personalities"
        className="text-muted-foreground text-sm hover:text-foreground"
      >
        ← Fiches
      </Link>
      <h1 className="mt-2 font-cal text-4xl">Nouvelle fiche</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        La fiche est rattachée à votre compte, non revendiquée et non vérifiée,
        jusqu’à ce que la personne la revendique. La photo s’ajoute après la
        création.
      </p>
      <div className="mt-8">
        <PersonalityFicheForm categories={categories} />
      </div>
    </>
  );
}
