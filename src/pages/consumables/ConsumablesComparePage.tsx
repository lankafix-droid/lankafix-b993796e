import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Package, Crown, Home, Building2, Building } from "lucide-react";
import { useProductsByRange } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const ConsumablesComparePage = () => {
  const sfProducts = useProductsByRange("smartfix_compatible");
  const oemProducts = useProductsByRange("genuine_oem");

  // Group by brand for side-by-side
  const brands = new Set<string>();
  sfProducts.data?.forEach((p: any) => brands.add(p.brand));
  oemProducts.data?.forEach((p: any) => brands.add(p.brand));

  const pairs = Array.from(brands).map((brand) => ({
    brand,
    smartfix: sfProducts.data?.find((p: any) => p.brand === brand),
    oem: oemProducts.data?.find((p: any) => p.brand === brand),
  })).filter((p) => p.smartfix && p.oem);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="text-lg font-bold text-foreground mb-1">SmartFix vs OEM Comparison</h1>
        <p className="text-xs text-muted-foreground mb-6">Compare value, quality, and trust side by side</p>

        {pairs.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No comparable pairs available yet.
          </div>
        )}

        {pairs.map((pair, i) => (
          <motion.div key={pair.brand} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">{pair.brand}</h2>
            <div className="grid grid-cols-2 gap-3">
              {/* SmartFix */}
              <Card className="border-accent/30">
                <CardContent className="p-3">
                  <Badge className="bg-accent/10 text-accent text-[10px] mb-2"><ShieldCheck className="w-2.5 h-2.5 mr-0.5" />SmartFix</Badge>
                  <p className="text-xs font-medium leading-tight mb-2">{pair.smartfix.title}</p>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <p>Price: <span className="font-semibold text-foreground">LKR {Number(pair.smartfix.price).toLocaleString()}</span></p>
                    <p>Yield: {pair.smartfix.yield_pages?.toLocaleString()} pages</p>
                    <p>Weight: {pair.smartfix.net_weight_grams}g</p>
                    <p>Warranty: {pair.smartfix.warranty_days}d</p>
                    <p>QR: {pair.smartfix.qr_enabled ? "Yes" : "No"}</p>
                    {pair.smartfix.yield_pages && pair.smartfix.price && (
                      <p>Cost/Page: ~LKR {(pair.smartfix.price / pair.smartfix.yield_pages).toFixed(2)}</p>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[9px]"><Crown className="w-2 h-2 mr-0.5" />Best Value</Badge>
                    <Badge variant="secondary" className="text-[9px]"><Home className="w-2 h-2 mr-0.5" />Best for Home</Badge>
                  </div>
                  <Button size="sm" className="w-full mt-3 text-xs">Add to Cart</Button>
                </CardContent>
              </Card>

              {/* OEM */}
              <Card className="border-primary/30">
                <CardContent className="p-3">
                  <Badge className="bg-primary/10 text-primary text-[10px] mb-2"><Package className="w-2.5 h-2.5 mr-0.5" />Genuine OEM</Badge>
                  <p className="text-xs font-medium leading-tight mb-2">{pair.oem.title}</p>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <p>Price: <span className="font-semibold text-foreground">LKR {Number(pair.oem.price).toLocaleString()}</span></p>
                    <p>Yield: {pair.oem.yield_pages?.toLocaleString()} pages</p>
                    <p>Weight: {pair.oem.net_weight_grams}g</p>
                    <p>Warranty: {pair.oem.warranty_days}d</p>
                    <p>QR: N/A</p>
                    {pair.oem.yield_pages && pair.oem.price && (
                      <p>Cost/Page: ~LKR {(pair.oem.price / pair.oem.yield_pages).toFixed(2)}</p>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[9px]"><Building2 className="w-2 h-2 mr-0.5" />Best for Corporate</Badge>
                    <Badge variant="secondary" className="text-[9px]"><Building className="w-2 h-2 mr-0.5" />Warranty-Sensitive</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-3 text-xs">Add to Cart</Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ))}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesComparePage;
