import { useParams, Link, useNavigate } from "react-router-dom";
import { getServiceByCode, getCategoryByCode } from "@/data/categories";
import { calculatePricing } from "@/config/pricingRules";
import { getZoneSurgeFactor } from "@/data/colomboZones";
import { useBookingStore } from "@/store/bookingStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Info, Wallet } from "lucide-react";
import { SERVICE_MODE_LABELS } from "@/types/booking";
import type { CategoryCode } from "@/types/booking";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import MascotIcon from "@/components/brand/MascotIcon";
import { TRUST_ICONS } from "@/brand/trustSystem";

const PricingBuilder = () => {
  const { catCode, svcCode } = useParams<{ catCode: string; svcCode: string }>();
  const navigate = useNavigate();
  const { draft, confirmBooking } = useBookingStore();
  const category = getCategoryByCode(catCode || "");
  const service = getServiceByCode(catCode || "", svcCode || "");

  if (!category || !service) {
    return (<div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-foreground mb-2">Service Not Found</h1><Button asChild variant="outline"><Link to="/categories">View All Categories</Link></Button></div></main><Footer /></div>);
  }

  const surgeFactor = getZoneSurgeFactor(draft.zone);
  const pricing = calculatePricing(catCode as CategoryCode, svcCode!, service.fromPrice, service.requiresDiagnostic, service.requiresQuote, draft.isEmergency, surgeFactor);

  const handleConfirm = () => {
    const jobId = confirmBooking(pricing, pricing.quoteRequired);
    if (jobId) {
      navigate(`/tracker/${jobId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to={`/precheck/${catCode}/${svcCode}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"><ArrowLeft className="w-4 h-4" /> Back</Link>
          <div className="flex items-center gap-3 mb-6">
            <MascotIcon state="default" size="sm" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Step 2 of 2</p>
              <h1 className="text-2xl font-bold text-foreground">Pricing Summary</h1>
              <p className="text-sm text-muted-foreground">{service.name} • {category.name}</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <LankaFixLogo size="sm" />
              <Badge variant="outline" className="text-xs">Estimate</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Mode</span><p className="font-medium text-foreground">{SERVICE_MODE_LABELS[draft.serviceMode]}</p></div>
              <div><span className="text-muted-foreground">Urgency</span><p className="font-medium text-foreground">{draft.isEmergency ? <span className="text-warning">⚡ Emergency</span> : "Scheduled"}</p></div>
              <div><span className="text-muted-foreground">Zone</span><p className="font-medium text-foreground">{draft.zone || "—"}</p></div>
              <div><span className="text-muted-foreground">Date</span><p className="font-medium text-foreground">{draft.scheduledDate || "—"}</p></div>
            </div>
          </div>

          <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Price Breakdown</h3>
            <div className="space-y-3">
              {pricing.visitFee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Visit Fee</span><span className="font-medium text-foreground">LKR {pricing.visitFee.toLocaleString("en-LK")}</span></div>}
              {pricing.diagnosticFee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Diagnostic Fee</span><span className="font-medium text-foreground">LKR {pricing.diagnosticFee.toLocaleString("en-LK")}</span></div>}
              {pricing.zoneFactorAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Zone Surcharge</span><span className="font-medium text-foreground">+ LKR {pricing.zoneFactorAmount.toLocaleString("en-LK")}</span></div>}
              {pricing.emergencySurcharge > 0 && <div className="flex justify-between text-sm"><span className="text-warning">Emergency Surcharge</span><span className="font-medium text-warning">+ LKR {pricing.emergencySurcharge.toLocaleString("en-LK")}</span></div>}
              {pricing.platformFee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Platform Fee</span><span className="font-medium text-foreground">LKR {pricing.platformFee.toLocaleString("en-LK")}</span></div>}
              <div className="border-t pt-3 flex justify-between text-sm"><span className="text-muted-foreground">Estimated Service Range</span><span className="font-bold text-foreground">LKR {pricing.estimatedMin.toLocaleString("en-LK")} – {pricing.estimatedMax.toLocaleString("en-LK")}</span></div>
              {pricing.partsSeparate && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Info className="w-3 h-3" />Parts will be quoted separately after inspection</div>}
            </div>
          </div>

          {pricing.quoteRequired && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div><p className="text-sm font-medium text-foreground">This service requires inspection before final quotation</p><p className="text-xs text-muted-foreground mt-1">A technician will inspect and provide a detailed quote for your approval.</p></div>
            </div>
          )}

          {pricing.depositRequired && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> Commitment Fee
              </h3>
              <p className="text-lg font-bold text-primary mb-2">LKR {pricing.depositAmount.toLocaleString("en-LK")}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Free cancellation within {pricing.cancelPolicy.freeCancelMinutes} minutes</p>
                <p>• {pricing.cancelPolicy.refundBeforeDispatchPercent}% refund before technician dispatch</p>
                <p>• {pricing.cancelPolicy.refundAfterDispatchPercent}% refund after dispatch</p>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full">
                <Wallet className="w-4 h-4 mr-2" /> Pay Deposit — LKR {pricing.depositAmount.toLocaleString("en-LK")}
              </Button>
            </div>
          )}

          <div className="bg-card rounded-xl border p-5 mb-4">
            <div className="flex items-center gap-2 mb-3"><TRUST_ICONS.CreditCard className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Payment</h3></div>
            <p className="text-sm text-muted-foreground mb-2">{pricing.quoteRequired ? "Pay after quote approval — no upfront charge for inspection." : "Pay after service completion — no hidden fees."}</p>
            <div className="flex flex-wrap gap-2">{["Cash", "Bank Transfer", "Card at Completion"].map((m) => (<Badge key={m} variant="outline" className="text-xs">{m}</Badge>))}</div>
          </div>

          {/* SLA info */}
          {(service.slaMinutesNormal || service.typicalDurationMinutes) && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <TRUST_ICONS.Clock className="w-4 h-4 text-primary" /> Expected Timeline
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {service.slaMinutesNormal && (
                  <div>
                    <span className="text-muted-foreground">Response Time</span>
                    <p className="font-medium text-foreground">{service.slaMinutesNormal < 60 ? `${service.slaMinutesNormal} min` : `${Math.round(service.slaMinutesNormal / 60)}h`}</p>
                  </div>
                )}
                {service.typicalDurationMinutes && (
                  <div>
                    <span className="text-muted-foreground">Typical Duration</span>
                    <p className="font-medium text-foreground">~{service.typicalDurationMinutes < 60 ? `${service.typicalDurationMinutes} min` : `${Math.round(service.typicalDurationMinutes / 60)}h`}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-8 flex items-start gap-3">
            <TRUST_ICONS.ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div><p className="text-sm font-medium text-foreground">Warranty-Backed Service</p><p className="text-xs text-muted-foreground mt-1">All LankaFix services come with a labor warranty. Parts warranty depends on supplier terms.</p></div>
          </div>

          <Button variant="hero" size="xl" className="w-full" onClick={handleConfirm}>Confirm Booking</Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PricingBuilder;
