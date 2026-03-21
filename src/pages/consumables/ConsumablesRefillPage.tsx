import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, RotateCcw, ChevronRight, ShieldCheck, Droplets, MessageCircle,
  Truck, ClipboardCheck, TestTube, PackageCheck, HelpCircle, Phone
} from "lucide-react";
import { PRINTER_MAPPINGS, BRANDS } from "@/data/printerMappings";
import { whatsappLink, SUPPORT_WHATSAPP, SUPPORT_PHONE } from "@/config/contact";
import { useCreateRefillOrder } from "@/hooks/useConsumables";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import smartfixInkBox from "@/assets/smartfix-ink-box.png";

/* ─── Refill-eligible filter: only Inkjet category with Ink / Cartridge type (NOT Ink Tank) ─── */
interface RefillableCartridge {
  code: string;
  isColor: boolean;
  label: string;
}

interface RefillablePrinter {
  brand: string;
  model: string;
  modelGroup: string;
  cartridges: RefillableCartridge[];
  consumableCodes: string;
}

function getRefillablePrinters(): RefillablePrinter[] {
  const seen = new Set<string>();
  const result: RefillablePrinter[] = [];

  for (const m of PRINTER_MAPPINGS) {
    const cat = m.category.toLowerCase();
    const type = m.consumableType.toLowerCase();
    // Only inkjet cartridges are refillable, not ink tanks
    if (!cat.includes("inkjet") || cat.includes("ink tank") || !type.includes("ink")) continue;

    const key = `${m.brand}|${m.printerModel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Parse codes - split by / and extract individual cartridge codes
    const cartridges: RefillableCartridge[] = [];
    const rawCodes = m.consumableCodes;

    // Handle patterns like "PG-47 / CL-57" or "HP 682 (B/C)"
    if (rawCodes.includes("/")) {
      const parts = rawCodes.split("/").map(s => s.trim());
      for (const part of parts) {
        // Skip XL/high-yield variants in parenthetical notes
        if (part.toLowerCase().includes("high yield")) continue;
        const clean = part.replace(/\(.*?\)/g, "").trim();
        if (!clean) continue;
        const isColor = /^cl[-\s]|colour|color|cyan|magenta|yellow|tri/i.test(clean) ||
          /^cli[-\s]/i.test(clean) || /^gt52/i.test(clean);
        cartridges.push({
          code: clean,
          isColor,
          label: isColor ? "Colour Cartridge" : "Black Cartridge",
        });
      }
    } else {
      // Single code like "HP 682 (B/C)"
      const hasBothColors = /\(B\/C\)/i.test(rawCodes);
      const clean = rawCodes.replace(/\(.*?\)/g, "").trim();
      if (hasBothColors) {
        cartridges.push({ code: clean, isColor: false, label: "Black Cartridge" });
        cartridges.push({ code: clean, isColor: true, label: "Colour Cartridge" });
      } else {
        cartridges.push({ code: clean, isColor: false, label: "Cartridge" });
      }
    }

    if (cartridges.length > 0) {
      result.push({
        brand: m.brand,
        model: m.printerModel,
        modelGroup: m.modelGroup,
        cartridges,
        consumableCodes: m.consumableCodes,
      });
    }
  }
  return result;
}

const ALL_REFILLABLE = getRefillablePrinters();
const REFILL_BRANDS = [...new Set(ALL_REFILLABLE.map(p => p.brand))].sort();

const PROCESS_STEPS = [
  { icon: Truck, label: "Pickup" },
  { icon: ClipboardCheck, label: "Inspect" },
  { icon: RotateCcw, label: "Refill" },
  { icon: TestTube, label: "Test" },
  { icon: PackageCheck, label: "Return" },
];

type FlowStep = "select" | "results" | "request" | "submitted";

const ConsumablesRefillPage = () => {
  const [step, setStep] = useState<FlowStep>("select");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedCartridges, setSelectedCartridges] = useState<RefillableCartridge[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<RefillablePrinter | null>(null);
  const [form, setForm] = useState({
    phone: "", address: "", pickup_method: "pickup", quantity: "1", notes: "",
    selected_code: "", // which cartridge is being refilled
  });
  const navigate = useNavigate();
  const createRefill = useCreateRefillOrder();

  // Filtered models by brand
  const modelsForBrand = useMemo(() => {
    if (!selectedBrand) return [];
    return ALL_REFILLABLE.filter(p => p.brand === selectedBrand)
      .sort((a, b) => a.model.localeCompare(b.model));
  }, [selectedBrand]);

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("");
    setSelectedCartridges([]);
    setSelectedPrinter(null);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    const printer = ALL_REFILLABLE.find(p => p.brand === selectedBrand && p.model === model);
    if (printer) {
      setSelectedPrinter(printer);
      setSelectedCartridges(printer.cartridges);
      setStep("results");
    }
  };

  const handleContinueRefill = (cartridge: RefillableCartridge) => {
    setForm(prev => ({ ...prev, selected_code: cartridge.code }));
    setStep("request");
  };

  const handleSubmit = () => {
    if (!form.phone || form.phone.length < 9) { toast.error("Please enter a valid phone number"); return; }
    if (form.pickup_method === "pickup" && !form.address) { toast.error("Please enter pickup address"); return; }
    if (!selectedPrinter) return;

    const pickupFee = form.pickup_method === "pickup" ? 300 : 0;
    createRefill.mutate({
      brand: selectedPrinter.brand,
      printer_model_id: null,
      cartridge_code: form.selected_code,
      quantity: parseInt(form.quantity) || 1,
      pickup_method: form.pickup_method,
      address_text: form.address,
      phone: form.phone,
      notes: `Printer: ${selectedPrinter.brand} ${selectedPrinter.model}. ${form.notes}`.trim(),
      service_fee: 800,
      pickup_fee: pickupFee,
      total: 800 + pickupFee,
      condition_data: { is_original: true, refilled_before: false, physical_damage: false, leakage: false, color_type: "black", print_issue: "", urgency: "standard" },
      derived_eligibility: "eligible",
    }, {
      onSuccess: () => setStep("submitted"),
    });
  };

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
          <span className="text-foreground font-medium">SmartFix Refill</span>
        </nav>

        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-5 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">SmartFix Refill</h1>
                  <p className="text-sm text-muted-foreground">
                    Refill your eligible ink cartridges with premium ink through LankaFix
                  </p>
                </div>
              </div>

              {/* Process Steps */}
              <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
                {PROCESS_STEPS.map((s, i) => (
                  <div key={s.label} className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center">
                      <s.icon className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Cross-links */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <Link to="/consumables/compatible">
            <Badge variant="outline" className="text-[10px] whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors">
              <ShieldCheck className="w-3 h-3 mr-1" /> SmartFix Compatible
            </Badge>
          </Link>
          <Link to="/consumables/oem">
            <Badge variant="outline" className="text-[10px] whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors">
              <Droplets className="w-3 h-3 mr-1" /> Genuine OEM
            </Badge>
          </Link>
          <Link to="/consumables">
            <Badge variant="outline" className="text-[10px] whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors">
              <HelpCircle className="w-3 h-3 mr-1" /> Find My Cartridge
            </Badge>
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP: Brand & Model Selection */}
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Select Printer Brand</Label>
                    <Select value={selectedBrand} onValueChange={handleBrandChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose your printer brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {REFILL_BRANDS.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBrand && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Label className="text-sm font-medium mb-2 block">Select Printer Model</Label>
                      <Select value={selectedModel} onValueChange={handleModelChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose your printer model" />
                        </SelectTrigger>
                        <SelectContent>
                          {modelsForBrand.map(p => (
                            <SelectItem key={p.model} value={p.model}>{p.model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      Only eligible ink cartridges are shown. Toner and ink-tank printers are not refillable through this service.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Track existing refill */}
              <Link to="/consumables/refill/track" className="block mt-3">
                <Button variant="outline" size="sm" className="w-full text-xs">Track Existing Refill Order</Button>
              </Link>
            </motion.div>
          )}

          {/* STEP: Cartridge Results */}
          {step === "results" && selectedPrinter && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="mb-1">
                <p className="text-sm text-muted-foreground">
                  Showing refillable cartridges for
                </p>
                <p className="text-base font-semibold text-foreground">
                  {selectedPrinter.brand} {selectedPrinter.model}
                </p>
              </div>

              {selectedCartridges.map((cartridge, i) => (
                <motion.div key={cartridge.code + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex gap-3 p-4">
                        {/* Cartridge Image */}
                        <div className="w-20 h-20 rounded-lg bg-muted/30 border border-border flex items-center justify-center shrink-0 overflow-hidden">
                          <img
                            src={smartfixInkBox}
                            alt={`${cartridge.code} cartridge`}
                            className="w-16 h-16 object-contain"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={cartridge.isColor ? "secondary" : "default"} className="text-[10px]">
                              {cartridge.isColor ? "Colour" : "Black"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200">
                              Refill Eligible
                            </Badge>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">{cartridge.code}</h3>
                          <p className="text-xs text-muted-foreground">{cartridge.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Refill service for your existing eligible cartridge
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-sm font-bold text-foreground">LKR 800</p>
                            <Button size="sm" className="text-xs h-8 px-4" onClick={() => handleContinueRefill(cartridge)}>
                              Continue Refill
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setStep("select"); setSelectedCartridges([]); setSelectedPrinter(null); }}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Change Printer
              </Button>
            </motion.div>
          )}

          {/* STEP: Refill Request Form */}
          {step === "request" && selectedPrinter && (
            <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-foreground mb-1">Refill Request</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{selectedPrinter.brand} {selectedPrinter.model}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px]">{form.selected_code}</Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Phone Number *</Label>
                    <Input placeholder="07X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Collection Method</Label>
                    <Select value={form.pickup_method} onValueChange={(v) => setForm({ ...form, pickup_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">Pickup from My Location (+LKR 300)</SelectItem>
                        <SelectItem value="dropoff">I'll Drop Off at LankaFix</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.pickup_method === "pickup" && (
                    <div>
                      <Label className="text-xs font-medium">Pickup Address *</Label>
                      <Textarea placeholder="Your address for cartridge pickup" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} maxLength={500} />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-medium">Quantity</Label>
                    <Input type="number" min="1" max="10" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Additional Notes</Label>
                    <Textarea placeholder="Any issues with the cartridge or special instructions" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} maxLength={500} />
                  </div>

                  {/* Order Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1.5 text-sm">
                    <p className="font-semibold text-foreground text-xs">Order Summary</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Refill service fee</span><span>LKR 800</span>
                    </div>
                    {form.pickup_method === "pickup" && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Pickup fee</span><span>LKR 300</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border mt-1.5">
                      <span>Total</span>
                      <span>LKR {800 + (form.pickup_method === "pickup" ? 300 : 0)}</span>
                    </div>
                    <p className="text-[10px] text-orange-600 mt-2">
                      ⚠ Refill acceptance is subject to physical inspection. Full refund if cartridge is rejected.
                    </p>
                  </div>

                  <Button className="w-full" onClick={handleSubmit} disabled={createRefill.isPending}>
                    {createRefill.isPending ? "Submitting..." : "Place Refill Request"}
                  </Button>
                </CardContent>
              </Card>

              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep("results")}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Cartridge Options
              </Button>
            </motion.div>
          )}

          {/* STEP: Submitted */}
          {step === "submitted" && (
            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <PackageCheck className="w-7 h-7 text-accent" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-1">Refill Request Submitted</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    We'll contact you shortly to arrange {form.pickup_method === "pickup" ? "pickup" : "drop-off"} of your cartridge.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => navigate("/consumables/refill/track")}>Track My Refill</Button>
                    <Button variant="outline" onClick={() => { setStep("select"); setSelectedBrand(""); setSelectedModel(""); }}>
                      Submit Another Refill
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Need Help Section */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Can't find your printer?</p>
            <p className="text-xs text-muted-foreground mb-3">
              Our team can help identify the right refill option for your cartridge.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs flex-1" asChild>
                <a href={whatsappLink(SUPPORT_WHATSAPP, "Hi LankaFix, I need help with a cartridge refill.")} target="_blank" rel="noopener noreferrer">
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

export default ConsumablesRefillPage;
