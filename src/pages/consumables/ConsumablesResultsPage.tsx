import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, ShieldCheck, Package, RotateCcw, Truck, AlertTriangle, Scale, QrCode, ShoppingCart, ArrowRight } from "lucide-react";
import { useConsumableSearch, useCart, type ConsumableResult, type MatchConfidence } from "@/hooks/useConsumables";
import { motion } from "framer-motion";
import { useState } from "react";

const confidenceBadge = (c: MatchConfidence) => {
  switch (c) {
    case "exact": return <Badge className="bg-accent text-accent-foreground text-[10px]">Exact Match</Badge>;
    case "likely": return <Badge variant="secondary" className="text-[10px]">Likely Match</Badge>;
    default: return <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">Needs Verification</Badge>;
  }
};

const rangeBadge = (range: string) => {
  if (range === "smartfix_compatible") return <Badge className="bg-accent/10 text-accent text-[10px] border border-accent/20"><ShieldCheck className="w-2.5 h-2.5 mr-0.5" />SmartFix Verified</Badge>;
  return <Badge className="bg-primary/10 text-primary text-[10px] border border-primary/20"><Package className="w-2.5 h-2.5 mr-0.5" />Genuine OEM</Badge>;
};

const ProductCard = ({ product, onAddToCart, navigate }: { product: ConsumableResult; onAddToCart: () => void; navigate: any }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl shrink-0">🖨️</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1.5">
            {rangeBadge(product.range_type)}
            {confidenceBadge(product.confidence)}
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-tight">{product.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{product.sku_code} · {product.brand}</p>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {product.warranty_days && <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">Warranty {product.warranty_days}d</Badge>}
            {product.qr_enabled && <Badge variant="outline" className="text-[9px]"><QrCode className="w-2 h-2 mr-0.5" />QR Verified</Badge>}
            {product.yield_pages && <Badge variant="outline" className="text-[9px]">Yield Declared</Badge>}
            {product.net_weight_grams && <Badge variant="outline" className="text-[9px]"><Scale className="w-2 h-2 mr-0.5" />Weight Declared</Badge>}
            {product.express_delivery_eligible && <Badge variant="outline" className="text-[9px]"><Truck className="w-2 h-2 mr-0.5" />Express</Badge>}
            {product.stock_qty > 0 ? <Badge variant="secondary" className="text-[9px]">In Stock</Badge> : <Badge variant="destructive" className="text-[9px]">Out of Stock</Badge>}
          </div>

          {/* Specs row */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[11px] text-muted-foreground">
            {product.yield_pages && <span>Yield: {product.yield_pages.toLocaleString()} pages</span>}
            {product.net_weight_grams && <span>Weight: {product.net_weight_grams}g</span>}
          </div>

          {/* Matched models */}
          {product.matched_models.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className="text-[10px] text-muted-foreground">Fits:</span>
              {product.matched_models.slice(0, 3).map((m) => (
                <Badge key={m.id} variant="outline" className="text-[9px]">{m.model_name}</Badge>
              ))}
              {product.matched_models.length > 3 && <Badge variant="outline" className="text-[9px]">+{product.matched_models.length - 3} more</Badge>}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="text-base font-bold text-foreground">LKR {Number(product.price).toLocaleString()}</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate(`/consumables/product/${product.id}`)}>Details</Button>
              <Button size="sm" className="text-xs h-8" onClick={onAddToCart} disabled={product.stock_qty <= 0}>
                <ShoppingCart className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
          </div>

          {/* Compare link */}
          {product.alternative_id && (
            <Button variant="ghost" size="sm" className="text-[10px] h-6 mt-1 px-0 text-primary"
              onClick={() => navigate(`/consumables/compare?sf=${product.range_type === "smartfix_compatible" ? product.id : product.alternative_id}&oem=${product.range_type === "genuine_oem" ? product.id : product.alternative_id}`)}>
              <ArrowRight className="w-2.5 h-2.5 mr-0.5" /> Compare SmartFix vs OEM
            </Button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ConsumablesResultsPage = () => {
  const [params] = useSearchParams();
  const initialQ = params.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [searchQ, setSearchQ] = useState(initialQ);
  const { data, isLoading } = useConsumableSearch(searchQ);
  const navigate = useNavigate();
  const cart = useCart();

  const handleSearch = () => { if (query.trim()) setSearchQ(query.trim()); };

  const addToCart = (p: ConsumableResult) => {
    cart.addItem({
      productId: p.id,
      title: p.title,
      sku_code: p.sku_code,
      brand: p.brand,
      range_type: p.range_type,
      price: p.price,
      stock_qty: p.stock_qty,
      express_eligible: !!p.express_delivery_eligible,
      confidence: p.confidence,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          {cart.count > 0 && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/consumables/cart")}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Cart ({cart.count})
            </Button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <Input placeholder="Search printer model or toner code..." value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1" />
          <Button onClick={handleSearch} size="icon"><Search className="w-4 h-4" /></Button>
        </div>

        {/* Confirmation Banner */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-800 dark:text-orange-200">
            Please confirm your printer matches one of the supported models before ordering.
          </p>
        </div>

        {isLoading && <div className="text-center py-8 text-sm text-muted-foreground">Searching...</div>}

        {data && data.results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-3">No matches found for "{searchQ}"</p>
            <div className="flex flex-col items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/consumables/finder")}>Try Guided Finder</Button>
              <p className="text-[10px] text-muted-foreground">Or upload a photo / contact LankaFix for help</p>
            </div>
          </div>
        )}

        {data && data.results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{data.results.length} result(s) · {data.matchType.replace(/_/g, " ")}</p>
            {data.results.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <ProductCard product={product} onAddToCart={() => addToCart(product)} navigate={navigate} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesResultsPage;
