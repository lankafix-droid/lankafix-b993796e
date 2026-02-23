import { useParams, useNavigate, Link } from "react-router-dom";
import { categories, serviceModeLabels } from "@/data/mockData";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Info, ShieldCheck } from "lucide-react";

const PricingBuilder = () => {
  const { catCode, svcCode } = useParams<{ catCode: string; svcCode: string }>();
  const navigate = useNavigate();
  const category = categories.find((c) => c.code === catCode);
  const service = category?.services.find((s) => s.code === svcCode);

  if (!category || !service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Service not found</p>
        </main>
      </div>
    );
  }

  const visitFee = 2500;
  const diagnosticFee = service.requiresDiagnostic ? 1500 : 0;
  const estimateLow = service.fromPrice;
  const estimateHigh = Math.round(service.fromPrice * 1.8);
  const depositRequired = service.requiresQuote;
  const depositAmount = depositRequired ? 1000 : 0;

  const handleConfirm = () => {
    navigate("/booking/LK-AC-000123");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to={`/precheck/${category.code}/${service.code}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">Step 2 of 3</span>
            <span className="text-sm text-muted-foreground">Pricing Estimate</span>
          </div>

          {/* Service Summary */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <h2 className="font-semibold text-foreground mb-2">{service.name}</h2>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{category.name}</span>
              <span>•</span>
              <span>{serviceModeLabels[service.allowedModes[0]]}</span>
              <span>•</span>
              <span>Scheduled</span>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Price Transparency
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Visit Fee</span>
                <span className="font-medium text-foreground">LKR {visitFee.toLocaleString()}</span>
              </div>
              {diagnosticFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diagnostic Fee</span>
                  <span className="font-medium text-foreground">LKR {diagnosticFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Service Range</span>
                <span className="font-medium text-foreground">
                  LKR {estimateLow.toLocaleString()} – {estimateHigh.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-muted-foreground">Parts</span>
                <span className="text-xs text-muted-foreground italic">Quoted separately</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Final price confirmed after inspection. No hidden charges.
            </p>
          </div>

          {/* Quote Required Banner */}
          {service.requiresQuote && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Quote Required</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This service requires on-site inspection before final quotation. You'll receive a detailed quote for approval.
                </p>
              </div>
            </div>
          )}

          {/* Deposit Section */}
          {depositRequired && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground">Commitment Fee</span>
                <span className="font-semibold text-foreground">LKR {depositAmount.toLocaleString()}</span>
              </div>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground transition-colors">Refund Policy</summary>
                <ul className="mt-2 space-y-1 ml-4 list-disc">
                  <li>100% refund if cancelled within 5 minutes</li>
                  <li>100% refund before technician dispatch</li>
                  <li>No refund after dispatch</li>
                </ul>
              </details>
            </div>
          )}

          {/* Warranty */}
          <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-8 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Warranty Included</p>
              <p className="text-xs text-muted-foreground mt-1">
                90-day labor warranty • Parts carry manufacturer warranty
              </p>
            </div>
          </div>

          <Button variant="hero" size="xl" className="w-full" onClick={handleConfirm}>
            Confirm Booking
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PricingBuilder;
