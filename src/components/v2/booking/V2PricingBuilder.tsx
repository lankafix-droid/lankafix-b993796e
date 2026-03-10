import type { V2ServicePackage, V2PriceType } from "@/data/v2CategoryFlows";
import type { CategoryCode } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Star, Info, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
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
    <div className="space-y-5 pb-28">
      <div>
        <h2 className="text-xl font-bold text-foreground">Choose Your Package</h2>
        <p className="text-sm text-muted-foreground mt-1">Select the service that fits your needs</p>
      </div>

      <div className="space-y-3">
        {packages.map((pkg, i) => {
          const isSelected = selectedId === pkg.id;
          return (
            <motion.button
              key={pkg.id}
              onClick={() => onSelect(pkg.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
              className={`w-full text-left rounded-2xl border p-5 transition-all relative active:scale-[0.98] ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                  : "border-border/60 bg-card hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-2.5 right-4">
                  <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 shadow-sm">
                    <Star className="w-3 h-3" /> Popular
                  </Badge>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm">{pkg.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{pkg.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full shrink-0 ml-3 mt-0.5 flex items-center justify-center transition-colors ${
                  isSelected ? "bg-primary" : "border-2 border-muted-foreground/20"
                }`}>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary-foreground" />}
                </div>
              </div>

              {/* Price row */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-lg font-bold text-foreground">
                  {pkg.price === 0 ? "Free" : `LKR ${pkg.price.toLocaleString()}`}
                </span>
                {pkg.priceMax && (
                  <span className="text-sm text-muted-foreground">— {pkg.priceMax.toLocaleString()}</span>
                )}
                <Badge variant="outline" className={`text-[10px] ml-auto shrink-0 ${PRICE_TYPE_COLORS[pkg.priceType]}`}>
                  {PRICE_TYPE_LABELS[pkg.priceType]}
                </Badge>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                {pkg.features.map((f, fi) => (
                  <div key={fi} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0 mt-0.5" />
                    <span className="leading-snug">{f}</span>
                  </div>
                ))}
              </div>

              {pkg.commitmentFee && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                  <Info className="w-3 h-3 shrink-0" />
                  <span>Commitment fee: LKR {pkg.commitmentFee.toLocaleString()} (deductible from total)</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Pricing explainability */}
      {deterministicPricing && (
        <PricingExplainabilityPanel pricing={deterministicPricing} />
      )}

      {/* AI Upsell */}
      <AISmartUpsell categoryCode={categoryCode} serviceType={selectedId} />

      {/* Trust strip */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center py-1">
        <ShieldCheck className="w-3 h-3 text-success" />
        Prices set by verified market rules · AI assists but never overrides
      </div>

      {/* Sticky CTA */}
      <div className="sticky-cta">
        <Button
          onClick={onContinue}
          disabled={!selectedId}
          size="lg"
          className="w-full gap-2 h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-sm active:scale-[0.97] transition-transform"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default V2PricingBuilder;
