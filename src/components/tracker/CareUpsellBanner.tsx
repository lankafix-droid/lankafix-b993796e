import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { getPlansForCategory } from "@/data/carePlans";
import { PLAN_TIER_LABELS } from "@/types/subscription";
import { track } from "@/lib/analytics";
import type { CategoryCode } from "@/types/booking";

interface CareUpsellBannerProps {
  categoryCode: CategoryCode;
  className?: string;
}

const CareUpsellBanner = ({ categoryCode, className }: CareUpsellBannerProps) => {
  const plans = getPlansForCategory(categoryCode);
  const recommended = plans.find((p) => p.tier === "standard") || plans[0];

  if (!recommended) return null;

  return (
    <Card className={`border-primary/20 bg-primary/[0.03] ${className || ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Protect this device with LankaFix Care
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              {recommended.name} — LKR {recommended.annualPrice.toLocaleString()}/year
            </p>
            <ul className="space-y-0.5 mb-3">
              {recommended.features.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-success shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button size="sm" variant="hero" asChild onClick={() => track("care_upsell_clicked", { categoryCode })}>
              <Link to="/care">
                View Care Plans <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Prevent breakdowns. Extend device life. Powered by verified LankaFix technicians.
        </p>
      </CardContent>
    </Card>
  );
};

export default CareUpsellBanner;
