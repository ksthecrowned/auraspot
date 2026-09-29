import { Skeleton } from '@/components/ui/skeleton';

export default function Page() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 pt-16">
      <Skeleton className="size-28 rounded-full" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-32 rounded-full" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="size-10 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-24 w-full rounded-[1.25rem]" />
    </div>
  );
}
