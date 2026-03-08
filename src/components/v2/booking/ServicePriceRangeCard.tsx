/**
 * ServicePriceRangeCard — Customer-facing estimated price display
 * with trust badges and transparency messaging.
 */
import { BadgeCheck, ShieldCheck, TrendingUp, Info, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  type MarketPriceRange,
  type PricingBadge,
  formatPriceRange,
  formatLKR,
  getPricingBadges,
} from "@/engines/pricingIntelligenceEngine";

interface ServicePriceRangeCardProps {
  range: MarketPriceRange;
  zoneAdjustment?: number;
  bookingsInCategory?: number;
  className?: string;
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  BadgeCheck: <BadgeCheck className="w-3 h-3" />,
  ShieldCheck: <ShieldCheck className="w-3 h-3" />,
  TrendingUp: <TrendingUp className="w-3 h-3" />,
};

const BADGE_VARIANTS: Record<string, string> = {
  success: "bg-success/10 text-success border-success/20",
  primary: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/20",
};

export default function ServicePriceRangeCard({
  range,
  zoneAdjustment = 1.0,
  bookingsInCategory = 0,
  className = "",
}: ServicePriceRangeCardProps) {
  const adjustedMin = Math.round(range.minLKR * zoneAdjustment);
  const adjustedMax = Math.round(range.maxLKR * zoneAdjustment);
  const badges = getPricingBadges(range.typicalLKR, range, bookingsInCategory);

  return (
    <div className={`bg-card border border-border rounded-xl p-4 space-y-3 ${className}`}>
      {/* Service label */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{range.label}</p>
        <Banknote className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Price range */}
      <div className="bg-primary/5 rounded-lg p-3 text-center">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Estimated Cost</p>
        <p className="text-lg font-bold text-primary">
          {formatPriceRange(adjustedMin, adjustedMax)}
        </p>
        {range.includesParts && (
          <p className="text-[10px] text-muted-foreground mt-1">Including parts · Final price after diagnosis</p>
        )}
        {!range.includesParts && (
          <p className="text-[10px] text-muted-foreground mt-1">Labour only · Parts quoted separately</p>
        )}
      </div>

      {/* Typical price */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Typical price</span>
        <span className="font-medium text-foreground">{formatLKR(Math.round(range.typicalLKR * zoneAdjustment))}</span>
      </div>

      {/* Trust badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${BADGE_VARIANTS[b.variant]}`}
            >
              {BADGE_ICONS[b.icon]}
              {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Transparency note */}
      <div className="flex items-start gap-2 bg-muted/30 rounded-lg p-2.5">
        <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Final price confirmed after technician diagnosis. No work starts without your approval.
        </p>
      </div>
    </div>
  );
}
