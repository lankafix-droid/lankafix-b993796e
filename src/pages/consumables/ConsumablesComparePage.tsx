import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Package, Crown, Home, Building2, Building, ShoppingCart } from "lucide-react";
import { useCompareProducts, useCart } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const CompareField = ({ label, sf, oem, highlight }: { label: string; sf: string; oem: string; highlight?: "sf" | "oem" }) => (
  <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center py-1.5 border-b border-border/50 last:border-0">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <span className={`text-xs text-center font-medium ${highlight === "sf" ? "text-accent" : "text-foreground"}`}>{sf}</span>
    <span className={`text-xs text-center font-medium ${highlight === "oem" ? "text-primary" : "text-foreground"}`}>{oem}</span>
  </div>
);

const ConsumablesComparePage = () => {
  const [params] = useSearchParams();
  const sfId = params.get("sf") || "";
  const oemId = params.get("oem") || "";
  const { data, isLoading } = useCompareProducts(sfId, oemId);
  const cart = useCart();
  const navigate = useNavigate();

  if (isLoading) return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading comparison...</div></div>;

  const sf = data?.smartfix;
  const oem = data?.oem;

  if (!sf || !oem) return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Both products are needed for comparison. Try searching for your printer first.</p>
          <Button size="sm" className="mt-3" onClick={() => navigate("/consumables")}>Search Products</Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  const sfCPP = sf.yield_pages && sf.price ? (sf.price / sf.yield_pages) : null;
  const oemCPP = oem.yield_pages && oem.price ? (oem.price / oem.yield_pages) : null;
  const savings = oem.price && sf.price ? Math.round(((oem.price - sf.price) / oem.price) * 100) : 0;

  const addSf = () => cart.addItem({ productId: sf.id, title: sf.title, sku_code: sf.sku_code, brand: sf.brand, range_type: sf.range_type, price: sf.price, stock_qty: sf.stock_qty ?? 0, express_eligible: !!sf.express_delivery_eligible, confidence: "exact" as const });
  const addOem = () => cart.addItem({ productId: oem.id, title: oem.title, sku_code: oem.sku_code, brand: oem.brand, range_type: oem.range_type, price: oem.price, stock_qty: oem.stock_qty ?? 0, express_eligible: !!oem.express_delivery_eligible, confidence: "exact" as const });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="text-lg font-bold text-foreground mb-1">SmartFix vs OEM Comparison</h1>
        <p className="text-xs text-muted-foreground mb-6">Compare value, quality, and trust side by side</p>

        {/* Header Row */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 mb-2">
          <div />
          <div className="text-center">
            <Badge className="bg-accent/10 text-accent text-[10px] border border-accent/20"><ShieldCheck className="w-2.5 h-2.5 mr-0.5" />SmartFix</Badge>
          </div>
          <div className="text-center">
            <Badge className="bg-primary/10 text-primary text-[10px] border border-primary/20"><Package className="w-2.5 h-2.5 mr-0.5" />Genuine OEM</Badge>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4">
              <CompareField label="Product" sf={sf.title} oem={oem.title} />
              <CompareField label="Price" sf={`LKR ${Number(sf.price).toLocaleString()}`} oem={`LKR ${Number(oem.price).toLocaleString()}`} highlight="sf" />
              <CompareField label="Yield" sf={sf.yield_pages ? `${sf.yield_pages.toLocaleString()} pages` : "-"} oem={oem.yield_pages ? `${oem.yield_pages.toLocaleString()} pages` : "-"} />
              <CompareField label="Weight" sf={sf.net_weight_grams ? `${sf.net_weight_grams}g` : "-"} oem={oem.net_weight_grams ? `${oem.net_weight_grams}g` : "-"} />
              <CompareField label="Warranty" sf={`${sf.warranty_days || 0} days`} oem={`${oem.warranty_days || 0} days`} />
              <CompareField label="QR Verified" sf={sf.qr_enabled ? "Yes ✓" : "No"} oem={oem.qr_enabled ? "Yes ✓" : "No"} highlight={sf.qr_enabled ? "sf" : undefined} />
              <CompareField label="Cost/Page" sf={sfCPP ? `~LKR ${sfCPP.toFixed(2)}` : "-"} oem={oemCPP ? `~LKR ${oemCPP.toFixed(2)}` : "-"} highlight={sfCPP && oemCPP && sfCPP < oemCPP ? "sf" : "oem"} />
              <CompareField label="Stock" sf={sf.stock_qty > 0 ? "In Stock" : "Out of Stock"} oem={oem.stock_qty > 0 ? "In Stock" : "Out of Stock"} />
            </CardContent>
          </Card>

          {savings > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mt-3 text-center">
              <p className="text-xs font-medium text-accent">Save ~{savings}% with SmartFix Verified Compatible</p>
            </div>
          )}

          {/* Recommendation Badges */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg border border-accent/20 p-3 text-center space-y-2">
              <p className="text-xs font-semibold text-accent">SmartFix Compatible</p>
              <div className="flex flex-wrap justify-center gap-1">
                <Badge variant="secondary" className="text-[9px]"><Crown className="w-2 h-2 mr-0.5" />Best Value</Badge>
                <Badge variant="secondary" className="text-[9px]"><Home className="w-2 h-2 mr-0.5" />Home</Badge>
                <Badge variant="secondary" className="text-[9px]">SME</Badge>
              </div>
              <Button size="sm" className="w-full text-xs" onClick={addSf} disabled={(sf.stock_qty ?? 0) <= 0}>
                <ShoppingCart className="w-3 h-3 mr-1" /> Add SmartFix
              </Button>
            </div>
            <div className="rounded-lg border border-primary/20 p-3 text-center space-y-2">
              <p className="text-xs font-semibold text-primary">Genuine OEM</p>
              <div className="flex flex-wrap justify-center gap-1">
                <Badge variant="secondary" className="text-[9px]"><Building2 className="w-2 h-2 mr-0.5" />Corporate</Badge>
                <Badge variant="secondary" className="text-[9px]"><Building className="w-2 h-2 mr-0.5" />Warranty</Badge>
              </div>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={addOem} disabled={(oem.stock_qty ?? 0) <= 0}>
                <ShoppingCart className="w-3 h-3 mr-1" /> Add OEM
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesComparePage;
