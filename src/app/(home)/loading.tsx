import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex w-full flex-col items-center gap-4 pt-12 lg:items-start">
      <Skeleton className="h-6 w-52 rounded-full" />
      <Skeleton className="h-14 w-full max-w-xl" />
      <Skeleton className="h-14 w-3/4 max-w-md" />
      <Skeleton className="mt-4 h-12 w-full max-w-lg rounded-full" />
      <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-[1.25rem]" />
        ))}
      </div>
    </div>
  );
}
