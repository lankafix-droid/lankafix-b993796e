import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
  variant?: "default" | "compact" | "wide";
}

/** Premium skeleton card with shimmer effect */
export default function SkeletonCard({ lines = 3, className, showAvatar = false, variant = "default" }: SkeletonCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border/40 p-5 space-y-3 shadow-[var(--shadow-card)]",
      variant === "compact" && "p-4 space-y-2.5",
      variant === "wide" && "p-6",
      className
    )}>
      {showAvatar && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-28 skeleton-shimmer rounded-full" />
            <div className="h-2.5 w-16 skeleton-shimmer rounded-full" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer rounded-full"
          style={{
            height: i === 0 ? "14px" : "10px",
            width: i === 0 ? "75%" : i === lines - 1 ? "45%" : "90%",
          }}
        />
      ))}
    </div>
  );
}

/** Skeleton row for list items */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-4", className)}>
      <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 skeleton-shimmer rounded-full" />
        <div className="h-2.5 w-1/2 skeleton-shimmer rounded-full" />
      </div>
      <div className="w-16 h-6 skeleton-shimmer rounded-full" />
    </div>
  );
}

/** Full page loading skeleton */
export function PageSkeleton() {
  return (
    <div className="container max-w-lg py-6 px-4 space-y-4 animate-fade-in">
      <div className="h-5 w-32 skeleton-shimmer rounded-full" />
      <div className="h-3 w-48 skeleton-shimmer rounded-full" />
      <SkeletonCard lines={4} showAvatar />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} variant="compact" />
    </div>
  );
}
