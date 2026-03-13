import { Star } from "lucide-react";

interface PartnerRatingBadgeProps {
  ratingAverage: number | null;
  completedJobsCount?: number | null;
  size?: "sm" | "md";
}

export default function PartnerRatingBadge({ ratingAverage, completedJobsCount, size = "sm" }: PartnerRatingBadgeProps) {
  if (!ratingAverage || ratingAverage === 0) return null;

  const displayRating = Number(ratingAverage).toFixed(1);

  return (
    <span className={`inline-flex items-center gap-1 ${size === "md" ? "text-sm" : "text-xs"}`}>
      <Star className={`${size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} text-warning fill-warning`} />
      <span className="font-semibold text-foreground">{displayRating}</span>
      {completedJobsCount != null && completedJobsCount > 0 && (
        <span className="text-muted-foreground">({completedJobsCount})</span>
      )}
    </span>
  );
}
