import { Link, useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck, Package, Truck, ChevronRight, RotateCcw, QrCode,
  Scale, Award, MessageCircle, Phone, HelpCircle, Printer
} from "lucide-react";
import { useProductsByRange } from "@/hooks/useConsumables";
import { whatsappLink, SUPPORT_WHATSAPP, SUPPORT_PHONE } from "@/config/contact";
import { motion } from "framer-motion";
import smartfixTonerBox from "@/assets/smartfix-toner-box.png";
import smartfixInkBox from "@/assets/smartfix-ink-box.png";

const ConsumablesRangeListPage = () => {
  const location = useLocation();
  const isOEM = location.pathname.includes("/oem");
  const range = isOEM ? "genuine_oem" : "smartfix_compatible";
  const { data: products, isLoading } = useProductsByRange(range);
  const navigate = useNavigate();

  const pageTitle = isOEM ? "Genuine OEM Supplies" : "SmartFix Compatible";
  const pageSubtitle = isOEM
    ? "Original manufacturer toner and cartridge supplies for supported printers"
    : "Better-value compatible toner and cartridge options for supported printers";
  const PageIcon = isOEM ? Package : ShieldCheck;
  const iconColor = isOEM ? "text-primary" : "text-accent";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5 flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/consumables" className="hover:text-foreground transition-colors">Printer Supplies</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{pageTitle}</span>
        </nav>

        {/* Page Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${iconColor}`}>
              <PageIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{pageTitle}</h1>
              <p className="text-xs text-muted-foreground">{pageSubtitle}</p>
            </div>
          </div>
        </motion.div>

        {/* Cross-links */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {!isOEM ? (
            <Link to="/consumables/oem">
              <Badge variant="outline" className="text-[10px] whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors">
                <Package className="w-3 h-3 mr-1" /> View Genuine OEM
              </Badge>
            </Link>
          ) : (
            <Link to="/consumables/compatible">
              <Badge variant="outline" className="text-[10px] whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors">
                <ShieldCheck className="w-3 h-3 mr-1" /> View SmartFix Compatible
              </Badge>
            </Link>
          )}
          <Link to="/consumables/refill">
            <Badge variant="outline" className="text-[10px] whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors">
              <RotateCcw className="w-3 h-3 mr-1" /> SmartFix Refill
            </Badge>
          </Link>
          <Link to="/consumables">
            <Badge variant="outline" className="text-[10px] whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors">
              <HelpCircle className="w-3 h-3 mr-1" /> Find My Cartridge
            </Badge>
          </Link>
        </div>

        {/* Value / Trust Block */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <Card className="mb-5">
            <CardContent className="p-4">
              {!isOEM ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Why choose SmartFix Compatible?</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5 text-accent shrink-0" /> QR-backed authenticity</div>
                    <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" /> Warranty protected</div>
                    <div className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-accent shrink-0" /> Yield & weight declared</div>
                    <div className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-accent shrink-0" /> Better value pricing</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Why choose Genuine OEM?</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary shrink-0" /> Original manufacturer product</div>
                    <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" /> Manufacturer warranty</div>
                    <div className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-primary shrink-0" /> Best for critical environments</div>
                    <div className="flex items-center gap-1.5"><Printer className="w-3.5 h-3.5 text-primary shrink-0" /> Warranty-sensitive use</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading */}
        {isLoading && <p className="text-center py-8 text-sm text-muted-foreground">Loading products...</p>}

        {/* Product Cards */}
        <div className="space-y-3">
          {products?.map((product: any, i: number) => {
            const isInk = product.product_type?.toLowerCase().includes("ink") || product.title?.toLowerCase().includes("ink");
            const productImage = !isOEM
              ? (isInk ? smartfixInkBox : smartfixTonerBox)
              : null;

            return (
              <motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/consumables/product/${product.id}`)}>
                  <CardContent className="p-4 flex items-start gap-3">
                    {/* Product Image */}
                    <div className="w-16 h-16 rounded-lg bg-muted/30 border border-border flex items-center justify-center shrink-0 overflow-hidden">
                      {productImage ? (
                        <img src={productImage} alt={product.title} className="w-14 h-14 object-contain" />
                      ) : (
                        <Package className="w-7 h-7 text-muted-foreground/30" />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {!isOEM && product.qr_enabled && (
                          <Badge variant="secondary" className="text-[10px]">
                            <QrCode className="w-2.5 h-2.5 mr-0.5" /> QR Verified
                          </Badge>
                        )}
                        {product.express_delivery_eligible && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Truck className="w-2.5 h-2.5 mr-0.5" /> Express
                          </Badge>
                        )}
                        <Badge variant={product.stock_qty > 0 ? "secondary" : "outline"} className="text-[10px]">
                          {product.stock_qty > 0 ? "In Stock" : "On Request"}
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
            );
          })}
        </div>

        {/* Empty State */}
        {products && products.length === 0 && (
          <div className="text-center py-12">
            <PageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mb-2">No {pageTitle.toLowerCase()} products available yet.</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/consumables")}>
              Find My Cartridge
            </Button>
          </div>
        )}

        {/* Need Help */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Need help choosing?</p>
            <p className="text-xs text-muted-foreground mb-3">
              Not sure whether to choose {isOEM ? "OEM" : "SmartFix Compatible"}? Our team can help.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs flex-1" asChild>
                <a href={whatsappLink(SUPPORT_WHATSAPP, `Hi LankaFix, I need help choosing a ${isOEM ? "genuine OEM" : "SmartFix compatible"} product.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="sm" className="text-xs flex-1" asChild>
                <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}>
                  <Phone className="w-3.5 h-3.5 mr-1" /> Call Us
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesRangeListPage;
