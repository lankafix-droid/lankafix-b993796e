import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck, Package, Truck } from "lucide-react";
import { useProductsByRange } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const ConsumablesRangeListPage = () => {
  const { rangeType } = useParams<{ rangeType: string }>();
  const range = rangeType === "oem" ? "genuine_oem" : "smartfix_compatible";
  const { data: products, isLoading } = useProductsByRange(range);
  const navigate = useNavigate();
  const isSmartFix = range === "smartfix_compatible";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-2 mb-1">
          {isSmartFix ? <ShieldCheck className="w-5 h-5 text-accent" /> : <Package className="w-5 h-5 text-primary" />}
          <h1 className="text-lg font-bold text-foreground">
            {isSmartFix ? "SmartFix Verified Compatible" : "Genuine OEM Supplies"}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          {isSmartFix ? "QR-backed, warranty-protected, better value alternatives" : "Original manufacturer cartridges and toner"}
        </p>

        {isLoading && <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p>}

        <div className="space-y-3">
          {products?.map((product: any, i: number) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/consumables/product/${product.id}`)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0">🖨️</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {product.qr_enabled && <Badge variant="secondary" className="text-[10px]">QR Verified</Badge>}
                      {product.express_delivery_eligible && <Badge variant="secondary" className="text-[10px]"><Truck className="w-2.5 h-2.5 mr-0.5" />Express</Badge>}
                      <Badge variant={product.stock_qty > 0 ? "secondary" : "outline"} className="text-[10px]">
                        {product.stock_qty > 0 ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-tight">{product.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.sku_code} · {product.brand}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        {product.yield_pages && <span>Yield: {product.yield_pages.toLocaleString()}p</span>}
                        {product.net_weight_grams && <span>{product.net_weight_grams}g</span>}
                      </div>
                      <span className="text-sm font-bold text-foreground">LKR {Number(product.price).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {products && products.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">No products available yet.</div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesRangeListPage;
