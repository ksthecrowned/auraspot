'use client';

import PersonalityVerificationBadge from '@/app/[link]/_components/personality-verification-badge';
import { AuraAvatar } from '@/components/aura-avatar';
import {
  AURA_ERROR,
  AURA_SECONDARY_BUTTON,
} from '@/components/forms/aura-fields';
import LinkQRModal from '@/components/modals/link-qr-modal';
import { AURA_CARD_CLASS } from '@/components/personality-page-shell';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatThousands } from '@/lib/money';
import { ROOT_DOMAIN } from '@/lib/site';
import { cn } from '@/lib/utils';
import { type RouterOutputs, api } from '@/trpc/react';
import {
  ArrowUpRight,
  BarChart3,
  Loader2,
  MoreHorizontal,
  QrCode,
  Trash2,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ProfileLink = RouterOutputs['profileLink']['getAll'][number];

const ICON_BUTTON =
  'inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

function plural(count: number, one: string, many: string) {
  return `${formatThousands(count)} ${count === 1 ? one : many}`;
}

function DeleteProfileDialog({
  link,
  open,
  onOpenChange,
}: {
  link: ProfileLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const remove = api.profileLink.delete.useMutation();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Supprimer « {link.name} » ?</DialogTitle>
          <DialogDescription>
            La fiche, ses blocs et ses statistiques seront supprimés
            définitivement. Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        {error && <p className={AURA_ERROR}>{error}</p>}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={remove.isPending}
            onClick={async () => {
              setError(null);
              try {
                await remove.mutateAsync({ link: link.link });
                onOpenChange(false);
                router.refresh();
              } catch {
                setError('La suppression n’a pas abouti.');
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-destructive px-6 py-3 font-medium text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {remove.isPending && <Loader2 className="size-4 animate-spin" />}
            Supprimer définitivement
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={AURA_SECONDARY_BUTTON}
          >
            Annuler
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardLinkCard({ link }: { link: ProfileLink }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className={cn(AURA_CARD_CLASS, 'flex flex-col gap-4')}>
      <div className="flex items-start gap-3">
        <AuraAvatar
          name={link.name}
          image={link.image}
          className="size-14 p-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-bold font-brand text-lg">{link.name}</p>
            {link.verificationStatus === 'verified' && (
              <PersonalityVerificationBadge size="sm" />
            )}
          </div>
          <p className="truncate text-muted-foreground text-xs">
            {ROOT_DOMAIN}/{link.link}
          </p>
        </div>
        {link.role === 'owner' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={ICON_BUTTON} title="Plus">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Supprimer la fiche
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="aura-chip">
          {link.role === 'owner' ? 'Propriétaire' : 'Gestionnaire'}
        </span>
        {link.status === 'suspended' && (
          <span className="aura-chip bg-destructive/10! text-destructive!">
            Suspendue
          </span>
        )}
        {link.claimStatus === 'unclaimed' && (
          <span className="aura-chip">Non revendiquée</span>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        {plural(link.monthlyViews, 'visite', 'visites')} sur 30 jours ·{' '}
        {plural(link.supportCount, 'soutien', 'soutiens')}
      </p>

      <div className="mt-auto flex items-center gap-1">
        <Link
          href={`/${link.link}`}
          className="aura-cta mr-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-brand font-semibold text-sm transition-transform hover:scale-[1.03]"
        >
          Ouvrir la fiche
          <ArrowUpRight className="size-4" />
        </Link>
        <Link
          href={`/app/analytics/${link.id}`}
          className={ICON_BUTTON}
          title="Statistiques"
        >
          <BarChart3 className="size-4" />
        </Link>
        <Link
          href={`/personalities/${link.link}/withdrawals`}
          className={ICON_BUTTON}
          title="Retraits"
        >
          <Wallet className="size-4" />
        </Link>
        <LinkQRModal linkSlug={link.link}>
          <button type="button" className={ICON_BUTTON} title="QR code">
            <QrCode className="size-4" />
          </button>
        </LinkQRModal>
      </div>

      <DeleteProfileDialog
        link={link}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
