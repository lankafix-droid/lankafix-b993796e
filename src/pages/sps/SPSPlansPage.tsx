import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, Sparkles, Phone, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupedPlans, SPS_PLANS } from "@/data/spsPlans";
import { PRINTER_CLASS_LABELS, SEGMENT_LABELS, type SPSSegment } from "@/types/sps";

export default function SPSPlansPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterSegment = searchParams.get("segment") as SPSSegment | null;

  const groups = useMemo(() => {
    if (filterSegment) {
      const filtered = SPS_PLANS.filter((p) => p.segment === filterSegment && p.is_active);
      return { [SEGMENT_LABELS[filterSegment] || filterSegment]: filtered };
    }
    return getGroupedPlans();
  }, [filterSegment]);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/sps")} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold">SPS Plan Directory</h1>
            <p className="text-xs text-muted-foreground">
              {filterSegment ? SEGMENT_LABELS[filterSegment] : "All plans for every need"}
            </p>
          </div>
        </div>

        {filterSegment && (
          <Button variant="ghost" size="sm" className="mb-4 text-xs" onClick={() => navigate("/sps/plans")}>
            ← View all plans
          </Button>
        )}

        {/* CTA */}
        <Card className="mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Not sure which plan?</div>
              <div className="text-xs text-muted-foreground">Let us recommend the perfect plan for you</div>
            </div>
            <Button size="sm" onClick={() => navigate("/sps/find-plan")}>Find My Plan</Button>
          </CardContent>
        </Card>

        {/* Plan Groups */}
        {Object.entries(groups).map(([groupName, plans]) => (
          <div key={groupName} className="mb-8">
            <h2 className="font-heading text-base font-bold text-foreground mb-3">{groupName}</h2>
            <div className="space-y-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate(`/sps/plans/${plan.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-foreground">{plan.plan_name}</span>
                          {plan.is_custom_quote && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">Custom Quote</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2 line-clamp-1">{plan.best_for}</div>
                        <div className="flex items-center gap-3 text-xs">
                          {!plan.is_custom_quote && (
                            <span className="font-bold text-primary">Rs. {plan.monthly_fee.toLocaleString()}/mo</span>
                          )}
                          <span className="text-muted-foreground">{plan.included_pages > 0 ? `${plan.included_pages.toLocaleString()} pages` : "Custom"}</span>
                          <span className="text-muted-foreground capitalize">{plan.support_level}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Need Help */}
        <div className="text-center pt-4 pb-8 space-y-3">
          <p className="text-xs text-muted-foreground">Need help choosing?</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Phone className="w-3.5 h-3.5" /> Request Callback
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Printer className="w-3.5 h-3.5" /> View Fleet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
