'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type RouterOutputs, api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

type Category = RouterOutputs['admin']['categories'][number];

function CategoryRow({ category }: { category: Category }) {
  const router = useRouter();
  const updateCategory = api.admin.updateCategory.useMutation();
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [isActive, setIsActive] = useState(category.isActive);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const parsed = Number(sortOrder);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('L’ordre doit être un nombre entier.');
      return;
    }
    try {
      await updateCategory.mutateAsync({
        categoryId: category.id,
        name,
        isActive,
        sortOrder: parsed,
      });
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'La catégorie n’a pas pu être enregistrée.'
      );
    }
  };

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1 text-sm">
          <Label htmlFor={`category-name-${category.id}`}>Nom</Label>
          <Input
            id={`category-name-${category.id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex w-24 flex-col gap-1 text-sm">
          <Label htmlFor={`category-order-${category.id}`}>Ordre</Label>
          <Input
            id={`category-order-${category.id}`}
            inputMode="numeric"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Active
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={updateCategory.isPending}
          onClick={save}
        >
          {updateCategory.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Enregistrer'
          )}
        </Button>
      </div>
      <p className="mt-2 text-muted-foreground text-xs">{category.slug}</p>
      {error && <p className="mt-2 text-destructive text-sm">{error}</p>}
    </li>
  );
}

export function CategoryEditor({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const createCategory = api.admin.createCategory.useMutation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await createCategory.mutateAsync({ name });
      setName('');
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'La catégorie n’a pas pu être créée.'
      );
    }
  };

  return (
    <div className="mt-8 flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nouvelle catégorie"
          required
        />
        <Button type="submit" disabled={createCategory.isPending}>
          {createCategory.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Ajouter'
          )}
        </Button>
      </form>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <ul className="flex flex-col gap-3">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </ul>
    </div>
  );
}
