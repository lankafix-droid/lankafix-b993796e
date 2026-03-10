import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
}

/** Premium skeleton card with shimmer effect */
export default function SkeletonCard({ lines = 3, className, showAvatar = false }: SkeletonCardProps) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border/50 p-5 space-y-3", className)}>
      {showAvatar && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 skeleton-shimmer rounded-full" />
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
