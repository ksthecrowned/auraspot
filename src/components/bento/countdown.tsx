'use client';

import CardOverlay from '@/components/bento/overlay';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import type { CountdownBentoSchema } from '@/types';
import { Pencil } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type * as z from 'zod';

type BentoData = z.infer<typeof CountdownBentoSchema>;

export const COUNTDOWN_CARD_SIZES = ['2x2', '4x2', '4x4'] as const;

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  // The occurrence being counted down to (the next one for repeating events).
  target: Date;
};

function getNextOccurrence(targetDate: string, repeat: string): Date {
  const target = new Date(targetDate);
  const now = new Date();

  if (repeat === 'yearly') {
    while (target <= now) {
      target.setFullYear(target.getFullYear() + 1);
    }
  } else if (repeat === 'monthly') {
    while (target <= now) {
      target.setMonth(target.getMonth() + 1);
    }
  } else if (repeat === 'weekly') {
    while (target <= now) {
      target.setDate(target.getDate() + 7);
    }
  }

  return target;
}

function getTimeLeft(targetDate: string, repeat = 'none'): TimeLeft {
  const target =
    repeat !== 'none'
      ? getNextOccurrence(targetDate, repeat)
      : new Date(targetDate);
  const diff = target.getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, target };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isPast: false,
    target,
  };
}

// Null until mounted: the server and the browser render at different
// instants (and locales), so the time left is only computed client-side.
function useCountdown(targetDate: string, repeat = 'none') {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTimeLeft(getTimeLeft(targetDate, repeat));
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate, repeat));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate, repeat]);

  return timeLeft;
}

const REPEAT_LABELS: Record<string, string> = {
  weekly: 'Chaque semaine',
  monthly: 'Chaque mois',
  yearly: 'Chaque année',
};

const pad = (value: number) => String(value).padStart(2, '0');

function formatTarget(date: Date, withWeekday = false) {
  return date.toLocaleDateString('fr-FR', {
    weekday: withWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function EmojiTile({
  emoji,
  size = 'md',
}: {
  emoji?: string;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      className={cn(
        'countdown-emoji inline-flex shrink-0 items-center justify-center',
        size === 'lg'
          ? 'size-16 rounded-2xl text-4xl'
          : 'size-11 rounded-xl text-2xl'
      )}
    >
      {emoji || '⏳'}
    </span>
  );
}

// Emoji tile, title, then the date and the repeat rule.
function CountdownHeader({
  bento,
  timeLeft,
  size = 'md',
}: {
  bento: BentoData;
  timeLeft: TimeLeft;
  size?: 'md' | 'lg';
}) {
  const repeat = bento.repeat ? REPEAT_LABELS[bento.repeat] : undefined;
  return (
    <div
      className={cn(
        'flex min-w-0 gap-3',
        size === 'lg' ? 'flex-col items-center text-center' : 'items-center'
      )}
    >
      <EmojiTile emoji={bento.emoji} size={size} />
      <div className="min-w-0">
        {bento.title && (
          <p
            className={cn(
              'truncate font-cal leading-tight',
              size === 'lg' ? 'text-xl' : 'text-base'
            )}
          >
            {bento.title}
          </p>
        )}
        <p className="mt-0.5 truncate text-muted-foreground text-xs first-letter:uppercase">
          {formatTarget(timeLeft.target, size === 'lg')}
          {repeat && ` · ${repeat}`}
        </p>
      </div>
    </div>
  );
}

function PastMessage({
  timeLeft,
  className,
}: {
  timeLeft: TimeLeft;
  className?: string;
}) {
  const today = timeLeft.target.toDateString() === new Date().toDateString();
  return (
    <p
      className={cn(
        'font-cal leading-none',
        today ? 'countdown-number' : 'text-muted-foreground',
        className
      )}
    >
      {today ? 'C’est aujourd’hui !' : 'Terminé'}
    </p>
  );
}

function TimeTile({
  value,
  label,
  size = 'md',
}: {
  value: number;
  label: string;
  size?: 'md' | 'lg';
}) {
  return (
    <div
      className={cn(
        'countdown-tile flex flex-col items-center justify-center rounded-xl',
        size === 'lg' ? 'px-3 py-4' : 'px-2 py-2.5'
      )}
    >
      <span
        className={cn(
          'countdown-number font-cal tabular-nums leading-none',
          size === 'lg' ? 'text-4xl' : 'text-2xl'
        )}
      >
        {pad(value)}
      </span>
      <span className="mt-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function timeTiles(timeLeft: TimeLeft) {
  return [
    { value: timeLeft.days, label: timeLeft.days > 1 ? 'jours' : 'jour' },
    { value: timeLeft.hours, label: 'h' },
    { value: timeLeft.minutes, label: 'min' },
    { value: timeLeft.seconds, label: 's' },
  ];
}

// 2x2: the one number that matters (J-12, or hh:mm:ss on the last day).
function CompactCountdown({
  bento,
  timeLeft,
}: {
  bento: BentoData;
  timeLeft: TimeLeft;
}) {
  let main = (
    <p className="countdown-number font-cal text-3xl tabular-nums leading-none">
      {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </p>
  );
  if (timeLeft.isPast) {
    main = <PastMessage timeLeft={timeLeft} className="text-2xl" />;
  } else if (timeLeft.days >= 1) {
    main = (
      <p className="countdown-number font-cal text-4xl tabular-nums leading-none">
        J-{timeLeft.days}
      </p>
    );
  }

  return (
    <div className="flex h-full w-full flex-col justify-between p-5">
      <EmojiTile emoji={bento.emoji} />
      <div className="min-w-0">
        {main}
        {bento.title && (
          <p className="mt-2.5 truncate font-cal text-sm leading-tight">
            {bento.title}
          </p>
        )}
        <p className="truncate text-muted-foreground text-xs">
          {formatTarget(timeLeft.target)}
        </p>
      </div>
    </div>
  );
}

// 4x2: header on top, the four units in tiles below.
function WideCountdown({
  bento,
  timeLeft,
}: {
  bento: BentoData;
  timeLeft: TimeLeft;
}) {
  return (
    <div className="flex h-full w-full flex-col justify-between gap-4 p-5">
      <CountdownHeader bento={bento} timeLeft={timeLeft} />
      {timeLeft.isPast ? (
        <PastMessage timeLeft={timeLeft} className="text-3xl" />
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {timeTiles(timeLeft).map((tile) => (
            <TimeTile key={tile.label} value={tile.value} label={tile.label} />
          ))}
        </div>
      )}
    </div>
  );
}

// 4x4: centered, large tiles.
function LargeCountdown({
  bento,
  timeLeft,
}: {
  bento: BentoData;
  timeLeft: TimeLeft;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-6">
      <CountdownHeader bento={bento} timeLeft={timeLeft} size="lg" />
      {timeLeft.isPast ? (
        <PastMessage timeLeft={timeLeft} className="text-4xl" />
      ) : (
        <div className="grid w-full grid-cols-4 gap-3">
          {timeTiles(timeLeft).map((tile) => (
            <TimeTile
              key={tile.label}
              value={tile.value}
              label={tile.label}
              size="lg"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CountdownCard({
  bento,
  editable,
}: {
  bento: BentoData;
  editable?: boolean;
}) {
  const params = useParams<{ link: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState(bento.title ?? '');
  const [targetDate, setTargetDate] = useState(bento.targetDate || '');
  const [emoji, setEmoji] = useState(bento.emoji ?? '');
  const [repeat, setRepeat] = useState(bento.repeat ?? 'none');

  const timeLeft = useCountdown(bento.targetDate, bento.repeat);

  const queryClient = api.useContext();
  const { mutateAsync: updateBento, isPending } =
    api.profileLink.updateBento.useMutation();

  const handleSave = async () => {
    if (!targetDate) {
      toast({
        title: 'Date manquante',
        description: 'Choisissez une date.',
      });
      return;
    }

    // Validate date
    const parsed = new Date(targetDate);
    if (Number.isNaN(parsed.getTime())) {
      toast({
        title: 'Date invalide',
        description: 'Saisissez une date valide.',
      });
      return;
    }

    const isoDate = parsed.toISOString();

    queryClient.profileLink.getByLink.setData({ link: params.link }, (old) => {
      if (!old) {
        return old;
      }
      return {
        ...old,
        bento: old.bento.map((b) =>
          b.id === bento.id
            ? {
                ...b,
                title: title || undefined,
                targetDate: isoDate,
                emoji: emoji || undefined,
                repeat,
              }
            : b
        ),
      };
    });

    await updateBento({
      link: params.link,
      bento: {
        ...bento,
        title: title || undefined,
        targetDate: isoDate,
        emoji: emoji || undefined,
        repeat,
      },
    });
    setEditOpen(false);
    toast({ title: 'Enregistré', description: 'Compte à rebours mis à jour.' });
  };

  const mdSize = bento.size.md ?? '2x2';

  const CardContent = () => {
    if (!bento.targetDate) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-muted/30">
          <span className="text-2xl">⏰</span>
          <p className="text-muted-foreground text-xs">
            {editable ? 'Choisir une date' : ''}
          </p>
        </div>
      );
    }

    if (!timeLeft) {
      return <div className="h-full w-full" />;
    }

    if (mdSize === '4x4') {
      return <LargeCountdown bento={bento} timeLeft={timeLeft} />;
    }
    if (mdSize === '4x2') {
      return <WideCountdown bento={bento} timeLeft={timeLeft} />;
    }
    return <CompactCountdown bento={bento} timeLeft={timeLeft} />;
  };

  return (
    <>
      <div
        className={cn(
          'group relative z-0 h-full w-full select-none rounded-2xl border border-border bg-card shadow-sm',
          editable
            ? 'transition-transform duration-200 ease-in-out md:cursor-move'
            : 'hover:-translate-y-0.5 transition-all duration-200 hover:border-border/80 hover:shadow-md'
        )}
      >
        {editable && (
          <CardOverlay bento={bento} allowedSizes={COUNTDOWN_CARD_SIZES} />
        )}

        <CardContent />

        {editable && (
          <button
            type="button"
            className="absolute top-3 right-3 z-50 cursor-pointer rounded-lg border border-border/50 bg-background/90 p-1.5 text-muted-foreground opacity-0 shadow-md backdrop-blur-sm transition-all hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cal text-xl">
              Modifier le compte à rebours
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cd-emoji" className="font-medium text-sm">
                Emoji
              </Label>
              <Input
                id="cd-emoji"
                placeholder="🎉"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="rounded-xl"
                maxLength={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cd-title" className="font-medium text-sm">
                Titre
              </Label>
              <Input
                id="cd-title"
                placeholder="Mon anniversaire"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cd-date" className="font-medium text-sm">
                Date cible
              </Label>
              <Input
                id="cd-date"
                type="date"
                value={targetDate ? targetDate.slice(0, 10) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setTargetDate(e.target.value);
                  }
                }}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cd-repeat" className="font-medium text-sm">
                Répétition
              </Label>
              <select
                id="cd-repeat"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as typeof repeat)}
                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                <option value="none">Aucune</option>
                <option value="weekly">Chaque semaine</option>
                <option value="monthly">Chaque mois</option>
                <option value="yearly">Chaque année</option>
              </select>
            </div>

            <Button
              onClick={handleSave}
              disabled={isPending}
              className="w-full rounded-xl"
            >
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
