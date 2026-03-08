import type { V2PricingArchetype } from "@/data/v2CategoryFlows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Eye, FileText, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  archetype: V2PricingArchetype;
  explanation: string;
  onContinue: () => void;
}

const ARCHETYPE_CONFIG: Record<V2PricingArchetype, {
  title: string;
  badge: string;
  badgeClass: string;
  iconBgClass: string;
  icon: React.ReactNode;
  points: string[];
}> = {
  fixed_price: {
    title: "Fixed Price Service",
    badge: "Fixed Price",
    badgeClass: "bg-success/10 text-success border-success/20",
    iconBgClass: "bg-success/10",
    icon: <CheckCircle2 className="w-7 h-7 text-success" />,
    points: [
      "Price shown is the price you pay",
      "No hidden fees or surprise charges",
      "Pay only after job completion",
    ],
  },
  diagnostic_first: {
    title: "Starting From Price",
    badge: "Diagnostic First",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    iconBgClass: "bg-warning/10",
    icon: <Eye className="w-7 h-7 text-warning" />,
    points: [
      "Starting price shown — final depends on device model & parts",
      "You choose part quality: Original, OEM, A Grade, or Compatible",
      "Detailed quote provided for your approval before work begins",
      "Diagnostic fee deducted from repair cost",
    ],
  },
  quote_required: {
    title: "Quote After Inspection",
    badge: "Quote Required",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    iconBgClass: "bg-primary/10",
    icon: <FileText className="w-7 h-7 text-primary" />,
    points: [
      "Site inspection booked first",
      "Detailed quote provided after visit",
      "Equipment, labor and installation itemized",
      "Inspection fee deductible from project cost",
    ],
  },
};

const V2PricingExpectation = ({ archetype, explanation, onContinue }: Props) => {
  const config = ARCHETYPE_CONFIG[archetype];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Pricing & What to Expect</h2>
        <p className="text-sm text-muted-foreground mt-1">How pricing works for this service</p>
      </div>

      <motion.div
        className="bg-card rounded-2xl border p-6 space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${config.iconBgClass} flex items-center justify-center shrink-0`}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg leading-tight">{config.title}</h3>
            <Badge variant="outline" className={`text-xs mt-1 ${config.badgeClass}`}>
              {config.badge}
            </Badge>
          </div>
        </div>

        {/* Points with staggered animation */}
        <div className="space-y-3">
          {config.points.map((point, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-2.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
            >
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-sm text-foreground leading-relaxed">{point}</span>
            </motion.div>
          ))}
        </div>

        {/* Explanation */}
        <div className="bg-muted/30 rounded-xl p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
        </div>
      </motion.div>

      {/* LankaFix guarantee */}
      <motion.div
        className="bg-success/5 border border-success/20 rounded-2xl p-4 flex items-start gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-foreground">LankaFix Guarantee</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            No extra work will proceed without your approval. Payment only after successful completion.
          </p>
        </div>
      </motion.div>

      <Button onClick={onContinue} size="lg" className="w-full gap-2 min-h-[52px] rounded-2xl text-base font-bold">
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2PricingExpectation;
