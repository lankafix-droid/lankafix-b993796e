import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShieldCheck, Package, Truck, QrCode, RotateCcw, Scale, FileText, HelpCircle } from "lucide-react";
import { useConsumableProduct } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const ConsumableProductPage = () => {
  const { productId } = useParams();
  const { data: product, isLoading } = useConsumableProduct(productId || "");
  const navigate = useNavigate();

  if (isLoading) return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading...</div></div>;
  if (!product) return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Product not found</div></div>;

  const isSmartFix = product.range_type === "smartfix_compatible";
  const compatModels = (product.consumable_compatibility as any[])?.map((c: any) => c.printer_models) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Product Image */}
          <div className="w-full h-48 bg-muted rounded-xl flex items-center justify-center text-5xl mb-4">🖨️</div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {isSmartFix ? (
              <Badge className="bg-accent/10 text-accent border border-accent/20"><ShieldCheck className="w-3 h-3 mr-1" />SmartFix Verified</Badge>
            ) : (
              <Badge className="bg-primary/10 text-primary border border-primary/20"><Package className="w-3 h-3 mr-1" />Genuine OEM</Badge>
            )}
            {product.qr_enabled && <Badge variant="secondary"><QrCode className="w-3 h-3 mr-1" />QR Verified</Badge>}
            {product.express_delivery_eligible && <Badge variant="secondary"><Truck className="w-3 h-3 mr-1" />Express</Badge>}
            <Badge variant="secondary">{product.stock_qty > 0 ? "In Stock" : "Out of Stock"}</Badge>
          </div>

          <h1 className="text-lg font-bold text-foreground mb-1">{product.title}</h1>
          <p className="text-sm text-muted-foreground mb-3">{product.sku_code} · {product.brand}</p>

          <div className="text-2xl font-bold text-foreground mb-4">
            LKR {Number(product.price).toLocaleString()}
          </div>

          {/* Specs */}
          <Card className="mb-4">
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              {product.yield_pages && (
                <div><p className="text-[10px] text-muted-foreground uppercase">Yield</p><p className="text-sm font-semibold">{product.yield_pages.toLocaleString()} pages</p></div>
              )}
              {product.net_weight_grams && (
                <div><p className="text-[10px] text-muted-foreground uppercase">Net Weight</p><p className="text-sm font-semibold">{product.net_weight_grams}g</p></div>
              )}
              <div><p className="text-[10px] text-muted-foreground uppercase">Warranty</p><p className="text-sm font-semibold">{product.warranty_days} days</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Color</p><p className="text-sm font-semibold capitalize">{product.color}</p></div>
            </CardContent>
          </Card>

          {/* What This Fits */}
          {compatModels.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm">What This Fits</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {compatModels.map((m: any) => (
                    <Badge key={m?.id} variant="outline" className="text-[10px]">{m?.model_name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Why Choose */}
          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{isSmartFix ? "Why Choose SmartFix Compatible?" : "Why Choose Genuine OEM?"}</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-1.5">
              {isSmartFix ? (
                <>
                  <p>✓ SmartFix quality-tested and verified compatible</p>
                  <p>✓ LankaFix warranty backed for {product.warranty_days} days</p>
                  <p>✓ QR serial tracking for authenticity</p>
                  <p>✓ Significant cost savings vs OEM</p>
                  <p>✓ Yield and weight declared transparently</p>
                </>
              ) : (
                <>
                  <p>✓ Original manufacturer product</p>
                  <p>✓ Best for warranty-sensitive environments</p>
                  <p>✓ Suitable for corporate and tender requirements</p>
                  <p>✓ Full manufacturer warranty coverage</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Warranty & Trust */}
          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Warranty & Trust</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              <p>{product.warranty_text || `${product.warranty_days}-day warranty coverage`}</p>
            </CardContent>
          </Card>

          {product.description && (
            <Card className="mb-6">
              <CardContent className="p-4 text-xs text-muted-foreground">{product.description}</CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full" size="lg">Add to Cart</Button>
            <Button variant="outline" className="w-full" size="lg">Buy Now</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" className="text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Compare {isSmartFix ? "with OEM" : "with SmartFix"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                <FileText className="w-3.5 h-3.5 mr-1" /> Bulk Quote
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs">
              <HelpCircle className="w-3.5 h-3.5 mr-1" /> Need Help Matching?
            </Button>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumableProductPage;
