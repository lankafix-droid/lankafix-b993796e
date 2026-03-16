/**
 * AIBookingSummaryCard — Compact advisory summary shown on booking confirmation/review.
 * Shows which AI modules contributed insights. Purely informational.
 * Advisory only — does not affect booking outcome.
 */
import { Brain, TrendingUp, Search, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface AIBookingSummaryCardProps {
  hasIssueTriage?: boolean;
  hasEstimate?: boolean;
  hasPartnerSuggestion?: boolean;
  hasFraudScan?: boolean;
  className?: string;
}

const AIBookingSummaryCard = ({
  hasIssueTriage,
  hasEstimate,
  hasPartnerSuggestion,
  hasFraudScan,
  className = "",
}: AIBookingSummaryCardProps) => {
  const modules = [
    hasIssueTriage && { icon: Search, label: "Issue analysis available" },
    hasEstimate && { icon: TrendingUp, label: "Estimated price range provided" },
    hasPartnerSuggestion && { icon: Brain, label: "Partner suggestions used" },
    hasFraudScan && { icon: Shield, label: "Trust scan completed" },
  ].filter(Boolean) as { icon: typeof Brain; label: string }[];

  if (modules.length === 0) return null;

  return (
    <motion.div
      className={`rounded-xl border border-primary/15 bg-primary/5 p-3.5 space-y-2 ${className}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">AI Advisory Insights</span>
        <Badge variant="outline" className="text-[8px] ml-auto text-muted-foreground">Optional</Badge>
      </div>
      <div className="space-y-1">
        {modules.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Icon className="w-3 h-3 text-primary/60 shrink-0" />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground/70">
        Advisory only — your booking is not affected by these insights. Final assessment by technician.
      </p>
    </motion.div>
  );
};

export default AIBookingSummaryCard;
