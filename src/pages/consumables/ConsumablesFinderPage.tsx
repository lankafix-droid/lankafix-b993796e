import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Camera, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const BRANDS = ["HP", "Canon", "Brother", "Epson", "Xerox", "Pantum", "Other"];
const DEVICE_TYPES = ["Printer", "Copier", "MFP (Multi-Function)"];
const PRINT_TYPES = ["Mono (Black & White)", "Color", "Not Sure"];
const KNOW_OPTIONS = [
  { label: "I know the printer model", target: "search" },
  { label: "I know the toner / cartridge code", target: "search" },
  { label: "I only know the brand", target: "search" },
  { label: "I want refill", target: "refill" },
  { label: "I am not sure – help me identify", target: "search" },
];

const ConsumablesFinderPage = () => {
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [printType, setPrintType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const totalSteps = 5;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/consumables/results?q=${encodeURIComponent(searchQuery.trim())}&brand=${brand}&type=${deviceType}`);
    }
  };

  const handleKnowSelect = (target: string) => {
    if (target === "refill") {
      navigate("/consumables/refill");
    } else {
      setStep(5);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="text-lg font-bold text-foreground mb-1">Guided Finder</h1>
        <p className="text-xs text-muted-foreground mb-4">We'll help you find the right consumable step by step</p>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Step 1: Select Brand</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {BRANDS.map((b) => (
                    <Button key={b} variant={brand === b ? "default" : "outline"} size="sm"
                      onClick={() => { setBrand(b); setStep(2); }}>
                      {b}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Step 2: Device Type</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {DEVICE_TYPES.map((d) => (
                    <Button key={d} variant={deviceType === d ? "default" : "outline"} className="w-full justify-start"
                      onClick={() => { setDeviceType(d); setStep(3); }}>
                      {d}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Step 3: Print Type</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {PRINT_TYPES.map((p) => (
                    <Button key={p} variant={printType === p ? "default" : "outline"} className="w-full justify-start"
                      onClick={() => { setPrintType(p); setStep(4); }}>
                      {p}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Step 4: What do you know?</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {KNOW_OPTIONS.map((o) => (
                    <Button key={o.label} variant="outline" className="w-full justify-start text-left text-sm"
                      onClick={() => handleKnowSelect(o.target)}>
                      {o.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Step 5: Search</CardTitle>
                  <p className="text-xs text-muted-foreground">Enter your printer model or toner code</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="e.g. M404dn, CF258A, TN-2365" value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
                    <Button onClick={handleSearch} size="icon"><Search className="w-4 h-4" /></Button>
                  </div>
                  {brand && (
                    <p className="text-[10px] text-muted-foreground">Searching within: <span className="font-medium text-foreground">{brand}</span> {deviceType && `· ${deviceType}`} {printType && `· ${printType}`}</p>
                  )}
                  <div className="text-center pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Can't find your model?</p>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Camera className="w-3.5 h-3.5 mr-1.5" /> Upload a Photo Instead
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {step > 1 && (
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Previous Step
          </Button>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesFinderPage;
