import { CONSUMER_CATEGORIES, type BookingCategory } from "@/data/consumerBookingCategories";
import { getCategoryLaunchState } from "@/config/categoryLaunchConfig";
import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { trackCategoryClick } from "@/lib/marketplaceAnalytics";

interface Props {
  selected: string;
  onSelect: (code: string) => void;
}

const ARCHETYPE_COLORS: Record<string, string> = {
  instant: "bg-green-500/10 text-green-700",
  inspection_first: "bg-amber-500/10 text-amber-700",
  consultation: "bg-primary/10 text-primary",
  delivery: "bg-blue-500/10 text-blue-700",
};

const CategorySelectionStep = ({ selected, onSelect }: Props) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-bold text-foreground">What do you need fixed?</h2>
      <p className="text-sm text-muted-foreground mt-1">Select a service to get matched with a verified technician.</p>
    </div>
    <div className="grid grid-cols-1 gap-2.5">
      {CONSUMER_CATEGORIES.map((cat, i) => {
        const launchState = getCategoryLaunchState(cat.code);
        const isComingSoon = launchState === "coming_soon";
        const isSelected = selected === cat.code;

        return (
          <motion.button
            key={cat.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            onClick={() => { if (!isComingSoon) { trackCategoryClick(cat.code, "booking_flow"); onSelect(cat.code); } }}
            disabled={isComingSoon}
            className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
              isComingSoon
                ? "border-border/30 bg-muted/30 opacity-50 cursor-not-allowed"
                : isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border/50 bg-card hover:border-border hover:shadow-sm"
            }`}
          >
            <span className="text-2xl shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground leading-tight">{cat.label}</p>
                {isComingSoon && (
                  <span className="text-[9px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5 uppercase tracking-wide">Soon</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
              {!isComingSoon && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${ARCHETYPE_COLORS[cat.archetype]}`}>
                    {cat.archetypeLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">{cat.priceHint}</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Clock className="w-2.5 h-2.5" />{cat.etaHint}
                  </span>
                </div>
              )}
            </div>
            {!isComingSoon && (
              <ArrowRight className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/40"}`} />
            )}
          </motion.button>
        );
      })}
    </div>
  </div>
);

export default CategorySelectionStep;
