import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, ShieldCheck, Package, RotateCcw, Truck, AlertTriangle,
  Scale, QrCode, ShoppingCart, ArrowRight, Printer, CheckCircle2, HelpCircle,
  Camera, MessageCircle, Phone, Upload
} from "lucide-react";
import { searchConsumables, type FinderResult, type SearchResultGroup, type MatchConfidence } from "@/lib/consumableSearch";
import { useCart } from "@/hooks/useConsumables";
import { whatsappLink, SUPPORT_WHATSAPP } from "@/config/contact";
import { motion } from "framer-motion";
import { useState, useMemo, useRef } from "react";
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

function SupplyResultCard({ group, index }: { group: SearchResultGroup; index: number }) {
  const navigate = useNavigate();
  const isInk = group.consumableType.toLowerCase().includes("ink");

  const smartfixImage = isInk ? smartfixInkBox : smartfixTonerBox;

  // Determine cartridge type label
  const typeLabel = group.isColor ? "Color" : "Black";
  const categoryLabel = group.category.includes("Ink Tank") ? "Ink Bottle" :
    group.consumableType.includes("Toner") ? "Toner Cartridge" : "Ink Cartridge";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
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
              <p className="text-xs text-muted-foreground mt-0.5">
                Yield: {group.yieldStr}
              </p>
            )}
          </div>

          {/* Compatible printers */}
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Works With
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

          {/* SmartFix + OEM Options */}
          <div className="p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Available Options
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SmartFix Compatible */}
              <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[11px] font-semibold text-accent">SmartFix Compatible</span>
                </div>
                <div className="w-full h-24 rounded-md bg-white flex items-center justify-center mb-2 overflow-hidden">
                  <img src={smartfixImage} alt="SmartFix Compatible" className="h-20 w-auto object-contain" />
                </div>
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><QrCode className="w-2.5 h-2.5" /> QR Verified</div>
                  <div className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Warranty Backed</div>
                  <div className="flex items-center gap-1"><Scale className="w-2.5 h-2.5" /> Yield & Weight Declared</div>
                </div>
                <Button size="sm" className="w-full mt-3 text-xs h-8">
                  <ShoppingCart className="w-3 h-3 mr-1" /> View SmartFix Option
                </Button>
              </div>

              {/* Genuine OEM */}
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
                <Button size="sm" variant="outline" className="w-full mt-3 text-xs h-8">
                  View OEM Option
                </Button>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2">
                <ArrowRight className="w-2.5 h-2.5 mr-0.5" /> Compare Options
              </Button>
              {group.refillEligible && (
                <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 text-orange-600">
                  <RotateCcw className="w-2.5 h-2.5 mr-0.5" /> Refill This Cartridge
                </Button>
              )}
            </div>
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
        No results for "<span className="font-medium text-foreground">{query}</span>". Don't worry — we can still help you find the right supply.
      </p>

      {/* Suggestions */}
      <div className="text-xs text-muted-foreground space-y-1 mb-5 max-w-sm mx-auto text-left bg-muted/30 rounded-lg p-3">
        <p className="font-medium text-foreground mb-1.5">💡 Try searching with:</p>
        <p>• Full printer model — e.g. <span className="font-medium text-foreground">Canon PIXMA E410</span></p>
        <p>• Toner/cartridge code — e.g. <span className="font-medium text-foreground">PG-47</span> or <span className="font-medium text-foreground">HP 85A</span></p>
        <p>• Brand + model — e.g. <span className="font-medium text-foreground">Brother HL-L2321D</span></p>
      </div>

      {/* Lead Capture Actions */}
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

const ConsumablesResultsPage = () => {
  const [params] = useSearchParams();
  const initialQ = params.get("q") || "";
  const initialBrand = params.get("brand") || "";
  const [query, setQuery] = useState(initialQ);
  const [searchQ, setSearchQ] = useState(initialQ);
  const navigate = useNavigate();
  const cart = useCart();

  const result: FinderResult = useMemo(() => {
    if (!searchQ || searchQ.length < 2) {
      return { query: searchQ, groups: [], confidence: "needs_verification" as const, matchType: "no_match" as const };
    }
    return searchConsumables(searchQ, initialBrand || undefined);
  }, [searchQ, initialBrand]);

  const handleSearch = () => {
    if (query.trim()) setSearchQ(query.trim());
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
                Please confirm your printer model matches before ordering. Try entering the full model name or exact toner code for an exact match.
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
              <SupplyResultCard key={`${group.brand}-${group.supplyCode}`} group={group} index={i} />
            ))}
          </div>
        )}

        {/* No results — Lead capture */}
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
