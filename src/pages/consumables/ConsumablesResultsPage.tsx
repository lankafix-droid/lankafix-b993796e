import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search, ShieldCheck, Package, RotateCcw, Truck, AlertTriangle,
  Scale, QrCode, ShoppingCart, ArrowRight, Printer, CheckCircle2, HelpCircle,
  Camera, MessageCircle, Phone, ChevronRight
} from "lucide-react";
import { searchConsumables, type FinderResult, type SearchResultGroup, type MatchConfidence } from "@/lib/consumableSearch";
import { useCart } from "@/hooks/useConsumables";
import { whatsappLink, SUPPORT_WHATSAPP } from "@/config/contact";
import { motion } from "framer-motion";
import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import smartfixTonerBox from "@/assets/smartfix-toner-box.png";
import smartfixInkBox from "@/assets/smartfix-ink-box.png";

const confidenceBadge = (c: MatchConfidence) => {
  switch (c) {
    case "exact":
      return <Badge className="bg-accent text-accent-foreground text-[10px]"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Exact Match</Badge>;
    case "likely":
      return <Badge variant="secondary" className="text-[10px]">Likely Match</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Needs Verification</Badge>;
  }
};

/** Resolved DB product IDs for a supply code group */
interface ResolvedProducts {
  smartfixId: string | null;
  oemId: string | null;
  smartfixPrice: number | null;
  oemPrice: number | null;
  smartfixStock: number | null;
  oemStock: number | null;
}

function SupplyResultCard({ group, index, resolved }: { group: SearchResultGroup; index: number; resolved: ResolvedProducts | null }) {
  const navigate = useNavigate();
  const cart = useCart();
  const isInk = group.consumableType.toLowerCase().includes("ink");
  const smartfixImage = isInk ? smartfixInkBox : smartfixTonerBox;

  const typeLabel = group.isColor ? "Colour" : "Black";
  const categoryLabel = group.category.includes("Ink Tank") ? "Ink Bottle" :
    group.consumableType.includes("Toner") ? "Toner Cartridge" : "Ink Cartridge";

  // Determine actual availability for each offering
  const hasOem = !!resolved?.oemId;
  const hasSmartFixCompatible = !!resolved?.smartfixId;
  const hasSmartFixRefill = !!group.refillEligible;

  const handleViewSmartFix = () => {
    if (resolved?.smartfixId) navigate(`/consumables/product/${resolved.smartfixId}`);
    else navigate(`/consumables/compatible`);
  };

  const handleViewOEM = () => {
    if (resolved?.oemId) navigate(`/consumables/product/${resolved.oemId}`);
    else navigate(`/consumables/oem`);
  };

  const handleCompare = () => {
    if (resolved?.smartfixId && resolved?.oemId) {
      navigate(`/consumables/compare?sf=${resolved.smartfixId}&oem=${resolved.oemId}`);
    } else {
      navigate(`/consumables/compare`);
    }
  };

  const handleRefill = () => {
    navigate(`/consumables/refill?code=${encodeURIComponent(group.supplyCode)}&brand=${encodeURIComponent(group.brand)}`);
  };

  const optionCount = [hasOem, hasSmartFixCompatible, hasSmartFixRefill].filter(Boolean).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground">{group.supplyCode}</span>
                <Badge variant="outline" className="text-[9px]">{typeLabel}</Badge>
                <Badge variant="outline" className="text-[9px]">{categoryLabel}</Badge>
              </div>
              {confidenceBadge(group.confidence)}
            </div>
            <p className="text-xs text-muted-foreground">
              {group.brand} · {group.consumableType} · {group.category}
            </p>
            {group.yieldStr && (
              <p className="text-xs text-muted-foreground mt-0.5">Yield: {group.yieldStr}</p>
            )}
          </div>

          {/* Compatible printers */}
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Compatible Printer Models
            </p>
            <div className="flex flex-wrap gap-1">
              {group.matchedPrinters.slice(0, 6).map((p) => (
                <Badge key={p} variant="outline" className="text-[10px] font-normal">
                  <Printer className="w-2.5 h-2.5 mr-0.5" />{group.brand} {p}
                </Badge>
              ))}
              {group.matchedPrinters.length > 6 && (
                <Badge variant="outline" className="text-[10px]">+{group.matchedPrinters.length - 6} more</Badge>
              )}
            </div>
          </div>

          {/* Available Options — only render cards that truly exist */}
          <div className="p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Available Options ({optionCount})
            </p>
            <div className={`grid grid-cols-1 ${optionCount >= 2 ? "sm:grid-cols-2" : ""} gap-3`}>

              {/* Genuine OEM — only if OEM product exists */}
              {hasOem && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-semibold text-primary">Genuine OEM</span>
                  </div>
                  <div className="w-full h-24 rounded-md bg-muted flex items-center justify-center mb-2">
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1"><Package className="w-2.5 h-2.5" /> Original Manufacturer</div>
                    <div className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Manufacturer Warranty</div>
                  </div>
                  {resolved?.oemPrice != null && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <span className="text-sm font-bold text-foreground">LKR {resolved.oemPrice.toLocaleString()}</span>
                      <Badge variant={resolved.oemStock && resolved.oemStock > 0 ? "secondary" : "outline"} className="text-[9px]">
                        {resolved.oemStock && resolved.oemStock > 0 ? "In Stock" : "On Request"}
                      </Badge>
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="w-full mt-2 text-xs h-8" onClick={handleViewOEM}>
                    <ShoppingCart className="w-3 h-3 mr-1" /> View Product
                  </Button>
                </div>
              )}

              {/* SmartFix Compatible — only if a real compatible product exists */}
              {hasSmartFixCompatible && (
                <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[11px] font-semibold text-accent">SmartFix Compatible</span>
                  </div>
                  <div className="w-full h-24 rounded-md bg-white dark:bg-muted flex items-center justify-center mb-2 overflow-hidden">
                    <img src={smartfixImage} alt="SmartFix Compatible" className="h-20 w-auto object-contain" />
                  </div>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1"><QrCode className="w-2.5 h-2.5" /> QR Verified</div>
                    <div className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Warranty Backed</div>
                    <div className="flex items-center gap-1"><Scale className="w-2.5 h-2.5" /> Yield & Weight Declared</div>
                  </div>
                  {resolved?.smartfixPrice != null && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <span className="text-sm font-bold text-foreground">LKR {resolved.smartfixPrice.toLocaleString()}</span>
                      <Badge variant={resolved.smartfixStock && resolved.smartfixStock > 0 ? "secondary" : "outline"} className="text-[9px]">
                        {resolved.smartfixStock && resolved.smartfixStock > 0 ? "In Stock" : "On Request"}
                      </Badge>
                    </div>
                  )}
                  <Button size="sm" className="w-full mt-2 text-xs h-8" onClick={handleViewSmartFix}>
                    <ShoppingCart className="w-3 h-3 mr-1" /> View Product
                  </Button>
                </div>
              )}

              {/* SmartFix Refill — only if refill-eligible, rendered as SERVICE card */}
              {hasSmartFixRefill && (
                <div className="rounded-lg border-2 border-orange-300/40 bg-orange-50/50 dark:bg-orange-950/10 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-[11px] font-semibold text-orange-600">SmartFix Refill</span>
                    <Badge variant="outline" className="text-[8px] border-orange-300 text-orange-500 ml-auto">SERVICE</Badge>
                  </div>
                  <div className="w-full h-24 rounded-md bg-orange-100/50 dark:bg-orange-950/20 flex items-center justify-center mb-2">
                    <div className="text-center">
                      <RotateCcw className="w-8 h-8 text-orange-400 mx-auto mb-1" />
                      <p className="text-[9px] text-orange-500 font-medium">Refill Service</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1"><Truck className="w-2.5 h-2.5" /> Pickup & Return</div>
                    <div className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Tested Before Return</div>
                    <div className="flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5" /> Eco-Friendly Reuse</div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-3 text-xs h-8 border-orange-300 text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950/30" onClick={handleRefill}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Request Refill
                  </Button>
                </div>
              )}
            </div>

            {/* No options available at all */}
            {optionCount === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <HelpCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No products or services currently available for this supply code.</p>
                <a
                  href={whatsappLink(SUPPORT_WHATSAPP, `Hi LankaFix, I'm looking for ${group.supplyCode} (${group.brand}) but no options are showing. Can you help?`)}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary font-medium mt-2 hover:underline"
                >
                  <MessageCircle className="w-3 h-3" /> WhatsApp us for availability
                </a>
              </div>
            )}

            {/* Compare action — only when both OEM and Compatible exist */}
            {hasOem && hasSmartFixCompatible && (
              <div className="mt-3">
                <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2" onClick={handleCompare}>
                  <ArrowRight className="w-2.5 h-2.5 mr-0.5" /> Compare OEM vs Compatible
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          {group.notes && (
            <div className="px-4 pb-3">
              <p className="text-[10px] text-muted-foreground italic bg-muted/30 rounded p-2">{group.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LeadCaptureSection({ query }: { query: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const whatsappMsg = `Hi LankaFix, I'm looking for the right toner/cartridge. I searched for "${query}" but couldn't find a match. Can you help?`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <Search className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">We couldn't find an exact match</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
        No results for "<span className="font-medium text-foreground">{query}</span>". Don't worry — we can still help.
      </p>

      <div className="text-xs text-muted-foreground space-y-1 mb-5 max-w-sm mx-auto text-left bg-muted/30 rounded-lg p-3">
        <p className="font-medium text-foreground mb-1.5">💡 Try searching with:</p>
        <p>• Full printer model — e.g. <span className="font-medium text-foreground">Canon PIXMA E410</span></p>
        <p>• Toner/cartridge code — e.g. <span className="font-medium text-foreground">PG-47</span> or <span className="font-medium text-foreground">HP 85A</span></p>
        <p>• Brand + model — e.g. <span className="font-medium text-foreground">Brother HL-L2321D</span></p>
      </div>

      <div className="space-y-2 max-w-xs mx-auto">
        <Button className="w-full" size="sm" asChild>
          <a href={whatsappLink(SUPPORT_WHATSAPP, whatsappMsg)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp LankaFix for Help
          </a>
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
          <Camera className="w-3.5 h-3.5 mr-1.5" /> Upload a Photo for Review
        </Button>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href={whatsappLink(SUPPORT_WHATSAPP, `Hi LankaFix, please call me back about finding the right toner/cartridge. I searched for "${query}".`)} target="_blank" rel="noopener noreferrer">
            <Phone className="w-3.5 h-3.5 mr-1.5" /> Request Callback
          </a>
        </Button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" />
    </motion.div>
  );
}

/** Normalize a code for fuzzy matching: lowercase, strip hyphens/spaces */
function normCode(s: string): string {
  return s.toLowerCase().replace(/[\s\-_./\\,()]+/g, "");
}

/** Extract the core numeric/alpha code from a supply code (e.g. "PG-47" → "pg47", "TN-2380" → "tn2380") */
function coreCode(s: string): string {
  return s.toLowerCase().replace(/[\s\-_./\\,()]+/g, "");
}

/** Check if two codes belong to the same product family (e.g. PG-745 and CL-746 should NOT pair) */
function isSameCodeFamily(skuCode: string, targetCode: string): boolean {
  const a = coreCode(skuCode);
  const b = coreCode(targetCode);
  // Exact match
  if (a === b) return true;
  // For paired codes like PG-47/CL-57, PG-745/CL-746 — the sku must match the specific code
  // Don't let PG-745 match CL-746 just because they share digits
  return false;
}

/** Resolve DB product IDs for each supply code group using multi-strategy lookup */
async function resolveProductIds(groups: SearchResultGroup[]): Promise<Map<string, ResolvedProducts>> {
  const map = new Map<string, ResolvedProducts>();
  if (groups.length === 0) return map;

  const codes = [...new Set(groups.map(g => g.supplyCode))];
  const brands = [...new Set(groups.map(g => g.brand))];

  const { data: allProducts } = await supabase
    .from("consumable_products")
    .select("id, sku_code, range_type, price, stock_qty, compare_group, brand")
    .eq("is_active", true)
    .in("brand", brands)
    .limit(500);

  if (!allProducts || allProducts.length === 0) return map;

  for (const group of groups) {
    const code = group.supplyCode;
    const brand = group.brand;
    const normTarget = normCode(code);

    // Strategy 1: Exact sku_code match (highest priority)
    let candidates = allProducts.filter(p => p.sku_code === code && p.brand === brand);

    // Strategy 2: Normalized sku_code match (PG-47 == pg47)
    if (candidates.length === 0) {
      candidates = allProducts.filter(p => normCode(p.sku_code) === normTarget && p.brand === brand);
    }

    // Strategy 3: compare_group exact match (e.g. compare_group "canon_325" for Canon 325)
    if (candidates.length === 0) {
      candidates = allProducts.filter(p =>
        p.compare_group && p.brand === brand &&
        normCode(p.compare_group) === normTarget
      );
    }

    // Strategy 4: compare_group contains the target code
    if (candidates.length === 0) {
      candidates = allProducts.filter(p =>
        p.compare_group && p.brand === brand &&
        normCode(p.compare_group).includes(normTarget)
      );
    }

    // Strategy 5: Brand + sku substring — BUT enforce strict matching
    // Only match if the sku contains the full target or vice versa, and they share
    // the same prefix family (e.g. "TN" for Brother toners)
    if (candidates.length === 0) {
      const targetPrefix = normTarget.replace(/\d+.*$/, ""); // e.g. "tn" from "tn2380"
      candidates = allProducts.filter(p => {
        if (p.brand !== brand) return false;
        const skuNorm = normCode(p.sku_code);
        const skuPrefix = skuNorm.replace(/\d+.*$/, "");
        // Prefixes must match to avoid cross-family pairing (PG vs CL)
        if (targetPrefix && skuPrefix && targetPrefix !== skuPrefix) return false;
        return skuNorm.includes(normTarget) || normTarget.includes(skuNorm);
      });
    }

    const sf = candidates.find(p => p.range_type === "smartfix_compatible");
    const oem = candidates.find(p => p.range_type === "genuine_oem");

    map.set(code, {
      smartfixId: sf?.id ?? null,
      oemId: oem?.id ?? null,
      smartfixPrice: sf ? Number(sf.price) : null,
      oemPrice: oem ? Number(oem.price) : null,
      smartfixStock: sf?.stock_qty ?? null,
      oemStock: oem?.stock_qty ?? null,
    });
  }

  return map;
}

const ConsumablesResultsPage = () => {
  const [params] = useSearchParams();
  const initialQ = params.get("q") || "";
  const initialBrand = params.get("brand") || "";
  const [query, setQuery] = useState(initialQ);
  const [searchQ, setSearchQ] = useState(initialQ);
  const [resolvedMap, setResolvedMap] = useState<Map<string, ResolvedProducts>>(new Map());
  const navigate = useNavigate();
  const cart = useCart();

  const result: FinderResult = useMemo(() => {
    if (!searchQ || searchQ.length < 2) {
      return { query: searchQ, groups: [], confidence: "needs_verification" as const, matchType: "no_match" as const };
    }
    return searchConsumables(searchQ, initialBrand || undefined);
  }, [searchQ, initialBrand]);

  // Resolve DB product IDs whenever results change
  useEffect(() => {
    if (result.groups.length > 0) {
      resolveProductIds(result.groups).then(setResolvedMap);
    } else {
      setResolvedMap(new Map());
    }
  }, [result.groups]);

  const handleSearch = () => {
    if (query.trim()) setSearchQ(query.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/consumables" className="hover:text-foreground transition-colors">Printer Supplies</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">Results</span>
          </div>
          {cart.count > 0 && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/consumables/cart")}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Cart ({cart.count})
            </Button>
          )}
        </nav>

        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search printer model or toner code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="icon"><Search className="w-4 h-4" /></Button>
        </div>

        {/* Match summary */}
        {result.groups.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-foreground">
                {result.groups.length} supply code{result.groups.length !== 1 ? "s" : ""} found
              </p>
              {confidenceBadge(result.confidence)}
            </div>
            <p className="text-xs text-muted-foreground">
              {result.matchType === "exact_code" && "Matched by supply code"}
              {result.matchType === "exact_model" && "Matched by printer model"}
              {result.matchType === "alias_match" && "Matched by model alias"}
              {result.matchType === "fuzzy" && "Partial match — please verify"}
              {result.matchType === "semantic" && "Intelligent match — please verify"}
            </p>
          </div>
        )}

        {/* Verification Banner */}
        {result.groups.length > 0 && result.confidence !== "exact" && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-orange-800 dark:text-orange-200">
                Please confirm your printer model matches before ordering. Try entering the full model name or exact supply code for an exact match.
              </p>
              <a
                href={whatsappLink(SUPPORT_WHATSAPP, `Hi LankaFix, I searched for "${searchQ}" and want to verify the match before ordering.`)}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-orange-700 dark:text-orange-300 font-medium mt-1 hover:underline"
              >
                <MessageCircle className="w-3 h-3" /> Not sure? WhatsApp us to verify
              </a>
            </div>
          </div>
        )}

        {/* Results */}
        {result.groups.length > 0 && (
          <div className="space-y-4">
            {result.groups.map((group, i) => (
              <SupplyResultCard
                key={`${group.brand}-${group.supplyCode}`}
                group={group}
                index={i}
                resolved={resolvedMap.get(group.supplyCode) ?? null}
              />
            ))}
          </div>
        )}

        {/* No results */}
        {searchQ && result.groups.length === 0 && (
          <LeadCaptureSection query={searchQ} />
        )}

        {/* Initial state */}
        {!searchQ && (
          <div className="text-center py-12 text-muted-foreground">
            <Printer className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter a printer model or supply code to find matching consumables</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesResultsPage;
