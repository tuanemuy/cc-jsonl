import { Skeleton } from "@/components/ui/skeleton";

export function ProjectSkeleton() {
  return (
    <div className="p-4 sm:p-5 border rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  );
}

export function SessionSkeleton() {
  return (
    <div className="p-4 sm:p-5 border rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-5 w-24 mb-2" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 max-w-[80%]">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-3 w-16 mt-1" />
      </div>
    </div>
  );
}
