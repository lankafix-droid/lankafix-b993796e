import { AC_STANDARD_INSTALL, AC_INSTALL_ADDONS, type ACInstallAddon } from "@/data/acInstallAddons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Minus, Plus, Info } from "lucide-react";
import { useState } from "react";

interface Props {
  onContinue: (addons: Record<string, number>) => void;
}

const V2ACInstallAddons = ({ onContinue }: Props) => {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(AC_INSTALL_ADDONS.map((a) => [a.id, a.defaultQty]))
  );

  const setQty = (id: string, delta: number) => {
    const addon = AC_INSTALL_ADDONS.find((a) => a.id === id);
    if (!addon) return;
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(addon.maxQty, (prev[id] || 0) + delta)),
    }));
  };

  const addonsTotal = AC_INSTALL_ADDONS.reduce(
    (sum, a) => sum + (quantities[a.id] || 0) * a.pricePerUnit,
    0
  );
  const grandTotal = AC_STANDARD_INSTALL.basePrice + addonsTotal;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">AC Installation Details</h2>
        <p className="text-sm text-muted-foreground mt-1">Standard package + optional add-ons</p>
      </div>

      {/* Standard package */}
      <div className="bg-card rounded-xl border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">{AC_STANDARD_INSTALL.label}</h3>
          <span className="font-bold text-foreground">LKR {AC_STANDARD_INSTALL.basePrice.toLocaleString()}</span>
        </div>
        <div className="space-y-1.5">
          {AC_STANDARD_INSTALL.includes.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add-ons */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Optional Add-Ons</h3>
        {AC_INSTALL_ADDONS.map((addon) => {
          const qty = quantities[addon.id] || 0;
          return (
            <div key={addon.id} className="bg-card rounded-xl border p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{addon.label}</p>
                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  LKR {addon.pricePerUnit.toLocaleString()} {addon.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty(addon.id, -1)}
                    disabled={qty === 0}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-foreground w-6 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(addon.id, 1)}
                    disabled={qty >= addon.maxQty}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {qty > 0 && (
                  <span className="text-sm font-medium text-foreground">
                    LKR {(qty * addon.pricePerUnit).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Standard Installation</span>
          <span className="text-foreground">LKR {AC_STANDARD_INSTALL.basePrice.toLocaleString()}</span>
        </div>
        {addonsTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Add-ons</span>
            <span className="text-foreground">LKR {addonsTotal.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold border-t border-primary/20 pt-2">
          <span className="text-foreground">Estimated Total</span>
          <span className="text-foreground">LKR {grandTotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>Final price confirmed after on-site inspection</span>
        </div>
      </div>

      <Button onClick={() => onContinue(quantities)} size="lg" className="w-full gap-2">
        Continue <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default V2ACInstallAddons;
