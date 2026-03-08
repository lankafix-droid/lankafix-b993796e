import type { V2PricingArchetype } from "@/data/v2CategoryFlows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Eye, FileText, ShieldCheck } from "lucide-react";

interface Props {
  archetype: V2PricingArchetype;
  explanation: string;
  onContinue: () => void;
}

const ARCHETYPE_CONFIG: Record<V2PricingArchetype, {
  title: string;
  badge: string;
  badgeClass: string;
  icon: React.ReactNode;
  points: string[];
}> = {
  fixed_price: {
    title: "Fixed Price Service",
    badge: "Fixed Price",
    badgeClass: "bg-success/10 text-success border-success/20",
    icon: <CheckCircle2 className="w-8 h-8 text-success" />,
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
    icon: <Eye className="w-8 h-8 text-warning" />,
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
    icon: <FileText className="w-8 h-8 text-primary" />,
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

      <div className="bg-card rounded-2xl border p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center shrink-0">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-foreground text-lg">{config.title}</h3>
            </div>
            <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
              {config.badge}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {config.points.map((point, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{point}</span>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>
      </div>

      <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">LankaFix Guarantee:</span> No extra work will proceed without your approval. Payment only after successful completion.
        </p>
      </div>

      <Button onClick={onContinue} size="lg" className="w-full gap-2">
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2PricingExpectation;
