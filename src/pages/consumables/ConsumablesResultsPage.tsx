import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, ShieldCheck, Package, RotateCcw, Truck, AlertTriangle } from "lucide-react";
import { useConsumableSearch } from "@/hooks/useConsumables";
import { motion } from "framer-motion";
import { useState } from "react";

const matchBadge = (type?: string) => {
  switch (type) {
    case "exact": return <Badge className="bg-accent text-accent-foreground text-[10px]">Exact Match</Badge>;
    case "likely": return <Badge variant="secondary" className="text-[10px]">Likely Match</Badge>;
    default: return <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">Needs Verification</Badge>;
  }
};

const rangeBadge = (range: string) => {
  if (range === "smartfix_compatible") return <Badge className="bg-accent/10 text-accent text-[10px] border border-accent/20">SmartFix Verified</Badge>;
  return <Badge className="bg-primary/10 text-primary text-[10px] border border-primary/20">Genuine OEM</Badge>;
};

const ConsumablesResultsPage = () => {
  const [params] = useSearchParams();
  const initialQ = params.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [searchQ, setSearchQ] = useState(initialQ);
  const { data, isLoading } = useConsumableSearch(searchQ);
  const navigate = useNavigate();

  const handleSearch = () => { if (query.trim()) setSearchQ(query.trim()); };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex gap-2 mb-4">
          <Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1" />
          <Button onClick={handleSearch} size="icon"><Search className="w-4 h-4" /></Button>
        </div>

        {/* Confirmation Banner */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-800 dark:text-orange-200">
            Please confirm your printer matches one of the supported models before proceeding.
          </p>
        </div>

        {isLoading && <div className="text-center py-8 text-sm text-muted-foreground">Searching...</div>}

        {data && data.results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-3">No matches found for "{searchQ}"</p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/consumables/finder")}>Try Guided Finder</Button>
              <Button variant="ghost" size="sm">Contact LankaFix</Button>
            </div>
          </div>
        )}

        {data && data.results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{data.results.length} result(s) · {data.matchType.replace("_", " ")}</p>
            {data.results.map((product: any, i: number) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl shrink-0">🖨️</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {rangeBadge(product.range_type)}
                          {matchBadge(product.match_type || "exact")}
                          {product.express_delivery_eligible && <Badge variant="secondary" className="text-[10px]"><Truck className="w-2.5 h-2.5 mr-0.5" />Express</Badge>}
                        </div>
                        <h3 className="text-sm font-semibold text-foreground leading-tight">{product.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{product.sku_code} · {product.brand}</p>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {product.yield_pages && <span>Yield: {product.yield_pages.toLocaleString()} pages</span>}
                          {product.net_weight_grams && <span>Weight: {product.net_weight_grams}g</span>}
                          {product.warranty_days && <span>Warranty: {product.warranty_days}d</span>}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <span className="text-base font-bold text-foreground">
                            LKR {Number(product.price).toLocaleString()}
                          </span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-xs"
                              onClick={() => navigate(`/consumables/product/${product.id}`)}>
                              Details
                            </Button>
                            <Button size="sm" className="text-xs">Add to Cart</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
