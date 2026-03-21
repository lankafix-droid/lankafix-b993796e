import { useState, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/hooks/useConsumables";
import { motion } from "framer-motion";
import { getSuggestions } from "@/lib/consumableSearch";
import { BRANDS, POPULAR_CHIPS } from "@/data/printerMappings";
import { whatsappLink, SUPPORT_WHATSAPP } from "@/config/contact";
import {
  Search, Printer, ShieldCheck, RotateCcw, QrCode, Camera, ScanLine,
  Package, ArrowRight, RefreshCw, FileText, HelpCircle, ShoppingCart,
  MessageCircle, ChevronRight
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ConsumablesLandingPage = () => {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const cart = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (query.length < 2) return [];
    return getSuggestions(query);
  }, [query]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      const params = new URLSearchParams({ q: query.trim() });
      if (brand !== "All") params.set("brand", brand);
      navigate(`/consumables/results?${params.toString()}`);
    }
  }, [query, brand, navigate]);

  const handleChip = (chipQuery: string) => {
    navigate(`/consumables/results?q=${encodeURIComponent(chipQuery)}`);
  };

  const handleSuggestionClick = (label: string) => {
    setQuery(label);
    setShowSuggestions(false);
    navigate(`/consumables/results?q=${encodeURIComponent(label)}`);
  };

  const handlePhotoUpload = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) navigate(`/consumables/results?photo=pending`);
  };

  const segments = [
    { title: "SmartFix Compatible", desc: "QR-backed, warranty-protected, better value", icon: ShieldCheck, color: "text-accent", link: "/consumables/compatible" },
    { title: "Genuine OEM Supplies", desc: "Original manufacturer cartridges & toner", icon: Package, color: "text-primary", link: "/consumables/oem" },
    { title: "SmartFix Refill", desc: "Refill eligible ink cartridges with premium ink", icon: RotateCcw, color: "text-orange-600", link: "/consumables/refill" },
  ];

  const quickActions: Array<{ label: string; icon: typeof RefreshCw; link: string; external?: boolean }> = [
    { label: "Reorder / Saved Devices", icon: RefreshCw, link: "/consumables/reorder" },
    { label: "Bulk / SME Quote", icon: FileText, link: "/consumables/bulk" },
    { label: "Verify SmartFix QR", icon: QrCode, link: "/consumables/qr-verify" },
    { label: "Need Help Matching?", icon: MessageCircle, link: whatsappLink(SUPPORT_WHATSAPP, "Hi LankaFix, I need help finding the right toner/cartridge for my printer."), external: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5 flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Printer Supplies</span>
        </nav>

        {/* Hero Title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Find My Toner / Cartridge</h1>
            </div>
            {cart.count > 0 && (
              <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/consumables/cart")}>
                <ShoppingCart className="w-3.5 h-3.5 mr-1" /> {cart.count}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Search by printer model or cartridge / toner code
          </p>
        </motion.div>

        {/* Search Hero Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-xl border border-border p-4 mb-5 shadow-sm">
          
          <label className="text-sm font-medium text-foreground mb-2 block">Printer Model or Supply Code</label>
          
          {/* Brand Filter */}
          <div className="mb-3">
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Brands</SelectItem>
                {BRANDS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="e.g. Canon E410, MG2570, PG-47, HP 682..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setShowSuggestions(false); handleSearch(); } }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                        onMouseDown={() => handleSuggestionClick(s.label)}
                      >
                        <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{s.label}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{s.brand}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={() => { setShowSuggestions(false); handleSearch(); }} className="px-5">
                <Search className="w-4 h-4 mr-1.5" /> Find
              </Button>
            </div>
          </div>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {POPULAR_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChip(chip.query)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
            <Button variant="outline" size="sm" className="text-xs justify-start" onClick={() => navigate("/consumables/finder")}>
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Browse by Brand
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" onClick={handlePhotoUpload}>
              <Camera className="w-3.5 h-3.5" /> Upload Photo
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" onClick={() => navigate("/consumables/qr-verify")}>
              <ScanLine className="w-3.5 h-3.5" /> Scan QR / Barcode
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" asChild>
              <a href={whatsappLink(SUPPORT_WHATSAPP, "Hi LankaFix, I need help finding the right toner/cartridge for my printer.")} target="_blank" rel="noopener noreferrer">
                <HelpCircle className="w-3.5 h-3.5" /> Need Help?
              </a>
            </Button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </motion.div>

        {/* 3 Segment Cards */}
        <div className="mb-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Browse by Category</p>
        </div>
        <div className="space-y-3 mb-6">
          {segments.map((seg, i) => (
            <motion.div key={seg.title} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Link to={seg.link}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 ${seg.color}`}>
                      <seg.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{seg.title}</p>
                      <p className="text-xs text-muted-foreground">{seg.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((a) => (
            a.external ? (
              <a key={a.label} href={a.link} target="_blank" rel="noopener noreferrer">
                <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-2 hover:bg-muted/50 transition-colors">
                  <a.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">{a.label}</span>
                </div>
              </a>
            ) : (
              <Link key={a.label} to={a.link}>
                <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-2 hover:bg-muted/50 transition-colors">
                  <a.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">{a.label}</span>
                </div>
              </Link>
            )
          ))}
        </div>

        {/* Trust Strip */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {["Warranty Backed", "QR Verified", "Yield Declared", "Weight Declared", "Express Delivery"].map((b) => (
            <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesLandingPage;
