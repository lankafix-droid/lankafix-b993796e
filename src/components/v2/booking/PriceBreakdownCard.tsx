/**
 * PriceBreakdownCard — Transparent quote breakdown for customers
 * showing inspection, labour, parts, and total with trust indicators.
 */
import { Receipt, ShieldCheck, Wrench, Package, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatLKR } from "@/engines/pricingIntelligenceEngine";

interface LineItem {
  label: string;
  amount: number;
  type?: "labour" | "parts" | "addon" | "fee";
}

interface PriceBreakdownCardProps {
  inspectionFee: number;
  labourItems: LineItem[];
  partsItems: LineItem[];
  addOns?: LineItem[];
  totalLKR: number;
  warrantyLabel?: string;
  isWithinMarketRange?: boolean;
  className?: string;
}

export default function PriceBreakdownCard({
  inspectionFee,
  labourItems,
  partsItems,
  addOns = [],
  totalLKR,
  warrantyLabel,
  isWithinMarketRange,
  className = "",
}: PriceBreakdownCardProps) {
  const labourTotal = labourItems.reduce((s, i) => s + i.amount, 0);
  const partsTotal = partsItems.reduce((s, i) => s + i.amount, 0);
  const addOnTotal = addOns.reduce((s, i) => s + i.amount, 0);

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-primary/5 px-4 py-3 flex items-center gap-2 border-b border-border">
        <Receipt className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Price Breakdown</span>
        {isWithinMarketRange && (
          <Badge className="ml-auto bg-success/10 text-success border-success/20 text-[9px]">
            <ShieldCheck className="w-3 h-3 mr-0.5" /> Fair Price
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Inspection fee */}
        {inspectionFee > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Inspection / Diagnostic Fee</span>
            <span className="font-medium text-foreground">{formatLKR(inspectionFee)}</span>
          </div>
        )}

        {/* Labour */}
        {labourItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide">
              <Wrench className="w-3 h-3" /> Labour
            </div>
            {labourItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs pl-4">
                <span className="text-foreground">{item.label}</span>
                <span className="font-medium">{formatLKR(item.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs pl-4 font-medium border-t border-dashed border-border pt-1">
              <span>Labour Subtotal</span>
              <span>{formatLKR(labourTotal)}</span>
            </div>
          </div>
        )}

        {/* Parts */}
        {partsItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide">
              <Package className="w-3 h-3" /> Parts
            </div>
            {partsItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs pl-4">
                <span className="text-foreground">{item.label}</span>
                <span className="font-medium">{formatLKR(item.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs pl-4 font-medium border-t border-dashed border-border pt-1">
              <span>Parts Subtotal</span>
              <span>{formatLKR(partsTotal)}</span>
            </div>
          </div>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide">
              <Plus className="w-3 h-3" /> Add-ons
            </div>
            {addOns.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs pl-4">
                <span className="text-foreground">{item.label}</span>
                <span className="font-medium">{formatLKR(item.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Total</span>
          <span className="text-lg font-bold text-primary">{formatLKR(totalLKR)}</span>
        </div>

        {/* Warranty */}
        {warrantyLabel && (
          <div className="bg-success/5 border border-success/20 rounded-lg p-2.5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <p className="text-[11px] text-foreground">{warrantyLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
