import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Search, Printer, ShieldCheck, RotateCcw, QrCode, Camera, ScanLine,
  Package, ArrowRight, RefreshCw, FileText, HelpCircle, Truck
} from "lucide-react";

const ConsumablesLandingPage = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) navigate(`/consumables/results?q=${encodeURIComponent(query.trim())}`);
  };

  const segments = [
    { title: "SmartFix Verified Compatible", desc: "QR-backed, warranty-protected, better value", icon: ShieldCheck, color: "text-accent", link: "/consumables/compatible" },
    { title: "Genuine OEM Supplies", desc: "Original manufacturer cartridges & toner", icon: Package, color: "text-primary", link: "/consumables/oem" },
    { title: "SmartFix Premium Refill", desc: "Pickup → Inspect → Refill → Test → Return", icon: RotateCcw, color: "text-orange-600", link: "/consumables/refill" },
  ];

  const quickActions = [
    { label: "Reorder Last Purchase", icon: RefreshCw, link: "/consumables/reorder" },
    { label: "Saved Devices", icon: Printer, link: "/consumables/reorder" },
    { label: "Bulk Quote", icon: FileText, link: "/consumables/bulk" },
    { label: "Need Help Matching?", icon: HelpCircle, link: "/consumables/finder" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Printer className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Printer & Copier Consumables</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Verified Matching · OEM + SmartFix · Refill & Return · Warranty Backed
          </p>
        </motion.div>

        {/* Search Hero */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-xl border border-border p-4 mb-6 shadow-sm">
          <label className="text-sm font-medium text-foreground mb-2 block">Find your toner or cartridge</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter printer model or toner code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} size="icon"><Search className="w-4 h-4" /></Button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button variant="outline" size="sm" className="text-xs justify-start" onClick={() => navigate("/consumables/finder")}>
              <Printer className="w-3.5 h-3.5 mr-1.5" /> By Printer Model
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start" onClick={() => navigate("/consumables/finder")}>
              <Package className="w-3.5 h-3.5 mr-1.5" /> By Toner Code
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Upload Photo
            </Button>
            <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" onClick={() => navigate("/consumables/qr-verify")}>
              <ScanLine className="w-3.5 h-3.5" /> Scan QR / Barcode
            </Button>
          </div>
        </motion.div>

        {/* Segment Cards */}
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
            <Link key={a.label} to={a.link}>
              <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-2 hover:bg-muted/50 transition-colors">
                <a.icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Trust Strip */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {["Warranty Backed", "QR Verified", "Yield Declared", "Express Delivery"].map((b) => (
            <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesLandingPage;
