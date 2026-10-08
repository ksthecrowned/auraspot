'use client';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { usePreview } from './preview-context';

export default function SupportButton({
  slug,
  name,
  canEdit,
  variant,
}: {
  slug: string;
  name: string;
  canEdit: boolean;
  variant: 'sticky' | 'inline';
}) {
  const { preview } = usePreview();

  // Editors get the action bar in that spot; they see the button in preview.
  if (canEdit && !preview && variant === 'sticky') {
    return null;
  }

  const button = (
    <Link
      href={`/support/${slug}`}
      aria-label={`Faire un don à ${name}`}
      className="aura-cta flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-brand font-semibold text-base shadow-[0_10px_30px_-10px_rgba(180,60,240,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <Heart className="size-4 fill-current" />
      Faire un don
    </Link>
  );

  if (variant === 'inline') {
    // Visitors already get the sticky bar below the large layout. Editors
    // never see that bar, so their button stays in the column at every width.
    return (
      <div className={canEdit && !preview ? undefined : '@4xl:block hidden'}>
        {button}
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-40 mt-6 @4xl:hidden bg-linear-to-t from-35% from-background to-transparent px-1 pt-6 pb-4">
      {button}
    </div>
  );
}
