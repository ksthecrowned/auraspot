import { cn } from '@/lib/utils';
import { useId } from 'react';

// Vector version of public/logo.svg. Keep both in sync.
export function AuraOrb({ className }: { className?: string }) {
  const id = useId();

  return (
    <svg
      viewBox="72 72 368 368"
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}orb`} x1="0.18" y1="0.1" x2="0.85" y2="0.92">
          <stop offset="0" stopColor="#FDBA8C" />
          <stop offset="0.38" stopColor="#F75FC0" />
          <stop offset="0.72" stopColor="#B43CF0" />
          <stop offset="1" stopColor="#5B6CFF" />
        </linearGradient>
        <linearGradient id={`${id}halo`} x1="0.1" y1="0.1" x2="0.9" y2="0.9">
          <stop offset="0" stopColor="#FF7AD9" />
          <stop offset="0.55" stopColor="#B15CFF" />
          <stop offset="1" stopColor="#3FD8FF" />
        </linearGradient>
        <radialGradient id={`${id}shine`} cx="0.34" cy="0.28" r="0.45">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="24" />
        </filter>
      </defs>
      <circle
        cx="256"
        cy="256"
        r="184"
        fill={`url(#${id}halo)`}
        opacity="0.85"
        filter={`url(#${id}blur)`}
      />
      <circle cx="256" cy="256" r="164" fill={`url(#${id}orb)`} />
      <circle cx="256" cy="256" r="164" fill={`url(#${id}shine)`} />
    </svg>
  );
}

// "AuraSpot" with the orb standing in for the "o".
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-bold font-brand',
        'inline-flex items-baseline text-foreground leading-none tracking-tight',
        className
      )}
    >
      <span className="sr-only">AuraSpot</span>
      <span aria-hidden="true">AuraSp</span>
      <AuraOrb className="mx-[0.02em] inline-block size-[0.6em] translate-y-[0.02em]" />
      <span aria-hidden="true">t</span>
    </span>
  );
}
