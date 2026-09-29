'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SIZE_CLASS = {
  sm: 'size-4',
  md: 'size-7 md:size-8',
} as const;

export default function PersonalityVerificationBadge({
  size = 'md',
}: {
  size?: keyof typeof SIZE_CLASS;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0 items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className={SIZE_CLASS[size]}
              role="img"
            >
              <title>Vérifié</title>
              <path
                d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
                className="fill-primary"
              />
              <path
                d="m9 12 2 2 4-4"
                fill="none"
                className="stroke-primary-foreground"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Vérifié</p>
          <p className="max-w-56 text-primary-foreground/80">
            La plateforme a vérifié l’identité ou l’autorisation du
            représentant.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
