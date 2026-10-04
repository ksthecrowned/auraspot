'use client';

const PROTOCOL_RE = /^https?:\/\//;
const TRAILING_SLASH_RE = /\/+$/;

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ROOT_DOMAIN } from '@/lib/site';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

function cleanDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(PROTOCOL_RE, '')
    .replace(TRAILING_SLASH_RE, '');
}

function DnsRecord({
  type,
  name,
  value,
}: {
  type: string;
  name: string;
  value: string;
}) {
  const copyValue = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copié',
        description: `« ${text} » copié dans le presse-papiers`,
      });
    });
  };

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4">
      <p className="mb-3 text-muted-foreground text-xs">
        Ajoutez cet enregistrement chez votre fournisseur DNS :
      </p>
      <div className="grid grid-cols-[60px_1fr_auto] items-center gap-x-3 gap-y-2 font-mono text-xs">
        <span className="text-muted-foreground">Type</span>
        <span className="font-semibold">{type}</span>
        <div />

        <span className="text-muted-foreground">Nom</span>
        <span className="font-semibold">{name}</span>
        <button
          type="button"
          onClick={() => copyValue(name)}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Copy className="h-3 w-3" />
        </button>

        <span className="text-muted-foreground">Valeur</span>
        <span className="truncate font-semibold">{value}</span>
        <button
          type="button"
          onClick={() => copyValue(value)}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function DomainStatus({
  configured,
  verified,
}: {
  configured: boolean;
  verified: boolean;
}) {
  if (configured && verified) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <p className="text-sm">Le domaine est configuré et vérifié</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <p className="text-sm">
        {configured
          ? 'DNS configuré, domaine pas encore vérifié'
          : 'DNS pas encore configuré. Ajoutez l’enregistrement ci-dessous.'}
      </p>
    </div>
  );
}

export default function CustomDomainModal({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { link } = useParams<{ link: string }>();
  const queryClient = api.useContext();

  const { data: profileLink } = api.profileLink.getByLink.useQuery({ link });

  const [domain, setDomain] = useState(profileLink?.customDomain ?? '');

  const cleaned = cleanDomain(domain);
  const hasDomain = !!profileLink?.customDomain;
  const domainChanged = cleaned !== (profileLink?.customDomain ?? '');

  const {
    data: domainCheck,
    isLoading: isChecking,
    refetch: recheckDomain,
  } = api.profileLink.checkDomain.useQuery(
    { domain: profileLink?.customDomain ?? '' },
    {
      enabled: hasDomain && open,
      refetchInterval: false,
    }
  );

  const { mutateAsync: updateLink, isPending } =
    api.profileLink.update.useMutation({
      onSuccess: () => {
        queryClient.profileLink.getByLink.invalidate({ link });
        queryClient.profileLink.checkDomain.invalidate();
        router.refresh();
        toast({
          title: 'Domaine mis à jour',
          description: domain
            ? 'Domaine enregistré. Configurez le DNS pour terminer.'
            : 'Domaine personnalisé retiré.',
        });
      },
      onError: (err) => {
        toast({
          title: 'Erreur',
          description: err.message,
        });
      },
    });

  const save = () => {
    if (!profileLink) {
      return;
    }

    updateLink({
      id: profileLink.id,
      customDomain: cleaned || null,
    });
  };

  const remove = () => {
    if (!profileLink) {
      return;
    }
    setDomain('');
    updateLink({
      id: profileLink.id,
      customDomain: null,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setDomain(profileLink?.customDomain ?? '');
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cal text-xl">
            Domaine personnalisé
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="custom-domain" className="font-medium text-sm">
              Domaine
            </Label>
            <Input
              id="custom-domain"
              placeholder="bio.mydomain.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="rounded-xl border border-border bg-card p-3"
            />
            <p className="text-muted-foreground text-xs">
              Saisissez le domaine sans http:// ni barre finale.
            </p>
          </div>

          {cleaned && (
            <div className="space-y-3">
              <Label className="font-medium text-sm">Configuration DNS</Label>

              {hasDomain && !domainChanged && domainCheck && (
                <DomainStatus
                  configured={domainCheck.configured}
                  verified={domainCheck.verified}
                />
              )}

              {cleaned.split('.').length > 2 ? (
                <DnsRecord
                  type="CNAME"
                  name={cleaned.split('.').slice(0, -2).join('.')}
                  value="cname.vercel-dns.com"
                />
              ) : (
                <DnsRecord type="A" name="@" value="76.76.21.21" />
              )}

              {hasDomain && !domainChanged && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => recheckDomain()}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Vérifier le DNS
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {hasDomain && (
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={remove}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-xl px-6"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={save}
              className={cn('rounded-xl px-6', !domainChanged && 'opacity-50')}
              disabled={isPending || !domainChanged}
            >
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            Le sous-domaine{' '}
            <span className="font-medium text-foreground">
              {link}.{ROOT_DOMAIN}
            </span>{' '}
            reste disponible à côté du domaine personnalisé.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
