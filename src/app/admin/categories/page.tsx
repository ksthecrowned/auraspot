import { CategoryEditor } from '@/components/admin/category-editor';
import { api } from '@/trpc/server';
import { adminPageMetadata } from '../access';

export function generateMetadata() {
  return adminPageMetadata('Catégories');
}

export default async function AdminCategoriesPage() {
  const categories = await api.admin.categories();

  return (
    <>
      <h1 className="font-cal text-4xl">Catégories</h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Une catégorie inactive disparaît de la découverte. Les fiches déjà
        classées gardent leur lien.
      </p>
      <CategoryEditor categories={categories} />
    </>
  );
}
