import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, X, ArrowRight, Phone, MessageCircle, BadgeCheck, Shield, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPlanById } from "@/data/spsPlans";
import { PRINTER_CLASS_LABELS, SEGMENT_LABELS } from "@/types/sps";

export default function SPSPlanDetailPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const plan = getPlanById(planId || "");

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="font-heading text-lg font-bold mb-2">Plan Not Found</h2>
          <Button onClick={() => navigate("/sps/plans")}>Browse Plans</Button>
        </div>
      </div>
    );
  }

  const included = [
    "SmartFix Certified printer",
    "Free delivery & installation",
    `${plan.included_pages.toLocaleString()} pages/month`,
    `${plan.support_level} support level`,
    "Meter-based transparent billing",
    ...(plan.pause_allowed ? ["Seasonal pause option"] : []),
  ];

  const excluded = [
    "Paper / media (customer provides)",
    "Deliberate damage or misuse",
    "Usage beyond fair-use policy",
    ...(plan.is_custom_quote ? [] : ["Pages beyond included limit (overage charged)"]),
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold">{plan.plan_name}</h1>
            <p className="text-xs text-muted-foreground">{SEGMENT_LABELS[plan.segment as keyof typeof SEGMENT_LABELS]}</p>
          </div>
        </div>

        {/* Pricing Hero */}
        <Card className="mb-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-5 text-center">
            <div className="text-xs font-medium text-primary mb-1">
              {PRINTER_CLASS_LABELS[plan.printer_class as keyof typeof PRINTER_CLASS_LABELS]}
            </div>
            {!plan.is_custom_quote ? (
              <>
                <div className="text-4xl font-bold text-primary mb-1">
                  Rs. {plan.monthly_fee.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </div>
                <div className="text-xs text-muted-foreground">{plan.included_pages.toLocaleString()} pages included</div>
              </>
            ) : (
              <div className="text-xl font-bold text-primary mb-1">Custom Quote</div>
            )}
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-accent font-medium">
              <BadgeCheck className="w-3.5 h-3.5" /> SmartFix Certified
            </div>
          </CardContent>
        </Card>

        {/* Best For */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-foreground mb-1">Best For</div>
            <div className="text-sm text-muted-foreground">{plan.best_for}</div>
          </CardContent>
        </Card>

        {/* Key Details */}
        {!plan.is_custom_quote && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-foreground mb-3">Plan Details</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Monthly Fee", value: `Rs. ${plan.monthly_fee.toLocaleString()}` },
                  { label: "Included Pages", value: plan.included_pages.toLocaleString() },
                  { label: "Overage Rate", value: `Rs. ${plan.overage_rate}/page` },
                  { label: "Deposit", value: `Rs. ${plan.deposit_amount.toLocaleString()}` },
                  { label: "Setup Fee", value: `Rs. ${plan.setup_fee.toLocaleString()}` },
                  { label: "Min Term", value: `${plan.min_term_months} months` },
                  { label: "Support Level", value: plan.support_level },
                  { label: "Meter Submission", value: plan.meter_submission_type },
                ].map((d) => (
                  <div key={d.label} className="text-xs">
                    <div className="text-muted-foreground">{d.label}</div>
                    <div className="font-semibold text-foreground capitalize">{d.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="text-xs font-semibold text-foreground mb-2">What's Included</div>
              <ul className="space-y-1.5">
                {included.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground mb-2">Not Included</div>
              <ul className="space-y-1.5">
                {excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <X className="w-3.5 h-3.5 text-destructive/50 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Deposit Explainer */}
        <Card className="mb-4 border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-foreground mb-1">Why a deposit is collected</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  The deposit secures your device assignment and protects against damage or misuse.
                  It is refundable at the end of your subscription, subject to final device inspection
                  and agreement terms. Deductions may apply for damage, missing parts, or outstanding amounts.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Summary */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Agreement Summary: </span>
                All subscriptions require LankaFix review and approval. Minimum term is {plan.min_term_months} months.
                Upgrade requests can be made anytime. Early termination is subject to agreement terms.
                {plan.pause_allowed && " Seasonal pause available for eligible periods."}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTAs */}
        <div className="space-y-3 pb-8">
          <Button className="w-full" size="lg" onClick={() => navigate(`/sps/request?plan=${plan.id}`)}>
            Subscribe to {plan.plan_name} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/sps/plans")}>
            Compare Plans
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1"><Phone className="w-3.5 h-3.5" /> Callback</Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
