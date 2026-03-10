import type { V2ServicePackage, V2PriceType } from "@/data/v2CategoryFlows";
import type { CategoryCode } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Star, Info, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { calculateDeterministicPrice } from "@/engines/deterministicPricingEngine";
import PricingExplainabilityPanel from "@/components/v2/booking/PricingExplainabilityPanel";
import AISmartUpsell from "@/components/ai/AISmartUpsell";

interface Props {
  packages: V2ServicePackage[];
  selectedId: string;
  onSelect: (id: string) => void;
  onContinue: () => void;
  categoryCode: CategoryCode;
}

const PRICE_TYPE_LABELS: Record<V2PriceType, string> = {
  fixed: "Fixed Price",
  starts_from: "Starts From",
  inspection_required: "Inspection Required",
};

const PRICE_TYPE_COLORS: Record<V2PriceType, string> = {
  fixed: "bg-success/10 text-success border-success/20",
  starts_from: "bg-warning/10 text-warning border-warning/20",
  inspection_required: "bg-primary/10 text-primary border-primary/20",
};

const V2PricingBuilder = ({ packages, selectedId, onSelect, onContinue, categoryCode }: Props) => {
  const selectedPkg = packages.find(p => p.id === selectedId);

  // Deterministic pricing — AI cannot override this
  const deterministicPricing = useMemo(() => {
    if (!selectedPkg) return null;
    return calculateDeterministicPrice({
      categoryCode,
      serviceCode: selectedPkg.id,
      basePrice: selectedPkg.price,
      isEmergency: false,
      requiresDiagnostic: selectedPkg.priceType === "inspection_required",
      requiresQuote: selectedPkg.priceType === "inspection_required",
    });
  }, [categoryCode, selectedPkg]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Choose Your Package</h2>
        <p className="text-sm text-muted-foreground mt-1">Select the service that fits your needs</p>
      </div>

      <div className="space-y-3">
        {packages.map((pkg) => {
          const isSelected = selectedId === pkg.id;
          return (
            <button
              key={pkg.id}
              onClick={() => onSelect(pkg.id)}
              className={`w-full text-left rounded-xl border p-5 transition-all relative ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-2.5 right-4">
                  <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                    <Star className="w-3 h-3" /> Popular
                  </Badge>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{pkg.description}</p>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
              </div>

              {/* Price */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-bold text-foreground">
                  {pkg.price === 0 ? "Free" : `LKR ${pkg.price.toLocaleString()}`}
                </span>
                {pkg.priceMax && (
                  <span className="text-sm text-muted-foreground">— {pkg.priceMax.toLocaleString()}</span>
                )}
                <Badge variant="outline" className={`text-xs ml-auto ${PRICE_TYPE_COLORS[pkg.priceType]}`}>
                  {PRICE_TYPE_LABELS[pkg.priceType]}
                </Badge>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-1.5">
                {pkg.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {pkg.commitmentFee && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" />
                  <span>Commitment fee: LKR {pkg.commitmentFee.toLocaleString()} (deductible)</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Deterministic Pricing Explainability Panel */}
      {deterministicPricing && (
        <PricingExplainabilityPanel pricing={deterministicPricing} />
      )}

      {/* AI Upsell — informational only, cannot set prices */}
      <AISmartUpsell categoryCode={categoryCode} serviceType={selectedId} />

      {/* Trust strip */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
        <ShieldCheck className="w-3 h-3 text-success" />
        Prices set by verified market rules · AI assists but never overrides
      </div>

      <Button onClick={onContinue} disabled={!selectedId} size="lg" className="w-full gap-2">
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2PricingBuilder;
