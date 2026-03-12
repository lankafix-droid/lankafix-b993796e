/**
 * InstantPriceCard — Compact trust-building card for instant-price services.
 * Shown in the booking flow when a service has an instant price range.
 */
import type { InstantPriceEntry } from "@/data/instantPricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Clock, Info, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  entry: InstantPriceEntry;
  onBookNow: () => void;
}

function formatLKR(n: number): string {
  return `Rs ${n.toLocaleString("en-LK")}`;
}

const InstantPriceCard = ({ entry, onBookNow }: Props) => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Estimated Price</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Based on common service costs in your area
        </p>
      </div>

      <motion.div
        className="bg-card rounded-2xl border border-primary/20 p-5 space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Price range + badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {entry.booking_label}
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {formatLKR(entry.min_price_lkr)} – {formatLKR(entry.max_price_lkr)}
            </p>
          </div>
          {entry.popular && (
            <Badge
              variant="outline"
              className="bg-success/10 text-success border-success/20 text-[10px] shrink-0 gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Popular
            </Badge>
          )}
        </div>

        {/* ETA */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span>{entry.estimated_eta_text}</span>
        </div>

        {/* Trust points */}
        <div className="space-y-2">
          {[
            "No extra work without your approval",
            "Pay only after successful completion",
            "Verified, background-checked technician",
          ].map((point, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-2"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.25 }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span className="text-xs text-foreground">{point}</span>
            </motion.div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 bg-muted/30 rounded-xl px-3 py-2.5">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {entry.disclaimer}
          </p>
        </div>
      </motion.div>

      {/* LankaFix Guarantee */}
      <motion.div
        className="bg-success/5 border border-success/20 rounded-2xl p-4 flex items-start gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.35 }}
      >
        <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-foreground">LankaFix Guarantee</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Transparent pricing with no surprises. If additional work is needed, you'll approve a quote first.
          </p>
        </div>
      </motion.div>

      <Button
        onClick={onBookNow}
        size="lg"
        className="w-full gap-2 min-h-[52px] rounded-2xl text-base font-bold"
      >
        Book Now <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default InstantPriceCard;
