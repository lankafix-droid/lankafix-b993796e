import { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  Truck, ClipboardCheck, TestTube, PackageCheck, HelpCircle, Phone, AlertTriangle
} from "lucide-react";
import { PRINTER_MAPPINGS, BRANDS } from "@/data/printerMappings";
import { whatsappLink, SUPPORT_WHATSAPP, SUPPORT_PHONE } from "@/config/contact";
import { useCreateRefillOrder, deriveEligibilityStatus, type ConditionData, type RefillEligibilityStatus } from "@/hooks/useConsumables";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import smartfixInkBox from "@/assets/smartfix-ink-box.png";

/* ─── Types ─── */
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
}

/* ─── Build refillable printer list from mapping data ─── */
function getRefillablePrinters(): RefillablePrinter[] {
  const seen = new Set<string>();
  const result: RefillablePrinter[] = [];

  for (const m of PRINTER_MAPPINGS) {
    const cat = m.category.toLowerCase();
    const type = m.consumableType.toLowerCase();
    // Only inkjet cartridges are refillable — exclude toner, ink tanks/bottles
    if (cat !== "inkjet" || !type.includes("ink")) continue;

    const key = `${m.brand}|${m.printerModel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const cartridges: RefillableCartridge[] = [];
    const rawCodes = m.consumableCodes;

    if (rawCodes.includes("/")) {
      const parts = rawCodes.split("/").map(s => s.trim());
      for (const part of parts) {
        if (part.toLowerCase().includes("high yield")) continue;
        const clean = part.replace(/\(.*?\)/g, "").trim();
        if (!clean) continue;
        const isColor = /^cl[-\s]|colour|color|cyan|magenta|yellow|tri/i.test(clean) ||
          /^cli[-\s]/i.test(clean);
        cartridges.push({
          code: clean,
          isColor,
          label: isColor ? "Colour Cartridge" : "Black Cartridge",
        });
      }
    } else {
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
      result.push({ brand: m.brand, model: m.printerModel, modelGroup: m.modelGroup, cartridges });
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

const CONDITION_OPTIONS = [
  { value: "empty", label: "Empty / Out of ink" },
  { value: "faded", label: "Faded print" },
  { value: "not_detected", label: "Not detected by printer" },
  { value: "leaking", label: "Leaking" },
  { value: "other", label: "Other" },
];

/** Derive eligibility from cartridge type and condition */
function deriveRefillEligibility(condition: string, isColor: boolean): RefillEligibilityStatus {
  // Leaking cartridges are risky
  if (condition === "leaking") return "not_recommended";
  // Not detected may indicate chip/electrical damage
  if (condition === "not_detected") return "likely_eligible";
  // Standard conditions
  return "eligible";
}

/** Build condition-aware notes */
function buildConditionNotes(condition: string, printerInfo: string, userNotes: string): string {
  const parts = [printerInfo];
  
  if (condition === "leaking") {
    parts.push("⚠ Cartridge reported as leaking — requires careful inspection before refill.");
  } else if (condition === "not_detected") {
    parts.push("⚠ Cartridge not detected by printer — chip/contact inspection required.");
  } else if (condition === "faded") {
    parts.push("Cartridge printing faded — likely low ink, standard refill expected.");
  } else if (condition === "empty") {
    parts.push("Cartridge reported empty — standard refill.");
  } else if (condition === "other") {
    parts.push("Custom condition reported — manual inspection required.");
  }

  if (userNotes.trim()) parts.push(userNotes.trim());
  return parts.join(" ");
}

type FlowStep = "select" | "results" | "request" | "submitted" | "rejected";

/** Resolve exact SmartFix/OEM replacement product IDs for a given cartridge code + brand */
async function resolveReplacementIds(code: string, brand: string): Promise<{ sfId: string | null; oemId: string | null }> {
  const norm = code.toLowerCase().replace(/[\s\-_./\\,()]+/g, "");
  const { data } = await supabase
    .from("consumable_products")
    .select("id, sku_code, range_type")
    .eq("is_active", true)
    .eq("brand", brand)
    .limit(200);

  if (!data || data.length === 0) return { sfId: null, oemId: null };

  const normSku = (s: string) => s.toLowerCase().replace(/[\s\-_./\\,()]+/g, "");
  let candidates = data.filter(p => normSku(p.sku_code) === norm);
  if (candidates.length === 0) {
    candidates = data.filter(p => normSku(p.sku_code).includes(norm) || norm.includes(normSku(p.sku_code)));
  }

  return {
    sfId: candidates.find(p => p.range_type === "smartfix_compatible")?.id ?? null,
    oemId: candidates.find(p => p.range_type === "genuine_oem")?.id ?? null,
  };
}

const ConsumablesRefillPage = () => {
  const [searchParams] = useSearchParams();
  const preCode = searchParams.get("code") || "";
  const preBrand = searchParams.get("brand") || "";

  const [step, setStep] = useState<FlowStep>("select");
  const [selectedBrand, setSelectedBrand] = useState(preBrand);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedCartridges, setSelectedCartridges] = useState<RefillableCartridge[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<RefillablePrinter | null>(null);
  const [selectedCartridge, setSelectedCartridge] = useState<RefillableCartridge | null>(null);
  const [form, setForm] = useState({
    phone: "", address: "", pickup_method: "pickup", quantity: "1", notes: "",
    selected_code: preCode, condition: "",
  });
  const navigate = useNavigate();
  const createRefill = useCreateRefillOrder();

  const modelsForBrand = useMemo(() => {
    if (!selectedBrand) return [];
    return ALL_REFILLABLE.filter(p => p.brand === selectedBrand)
      .sort((a, b) => a.model.localeCompare(b.model));
  }, [selectedBrand]);

  // Auto-prefill from URL params: find matching printer + cartridge and jump to results
  useMemo(() => {
    if (preBrand && preCode && step === "select") {
      const normTarget = preCode.toLowerCase().replace(/[\s\-_]+/g, "");
      // Find printer that has this cartridge code
      const match = ALL_REFILLABLE.find(p => {
        if (p.brand.toLowerCase() !== preBrand.toLowerCase()) return false;
        return p.cartridges.some(c => c.code.toLowerCase().replace(/[\s\-_]+/g, "") === normTarget);
      });
      if (match) {
        setSelectedBrand(match.brand);
        setSelectedModel(match.model);
        setSelectedPrinter(match);
        setSelectedCartridges(match.cartridges);
        setStep("results");
      }
    }
  }, []);

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("");
    setSelectedCartridges([]);
    setSelectedPrinter(null);
    setSelectedCartridge(null);
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
    setSelectedCartridge(cartridge);
    setForm(prev => ({ ...prev, selected_code: cartridge.code }));
    setStep("request");
  };

  const handleSubmit = () => {
    if (!form.phone || form.phone.length < 9) { toast.error("Please enter a valid phone number"); return; }
    if (form.pickup_method === "pickup" && !form.address) { toast.error("Please enter pickup address"); return; }
    if (!selectedPrinter || !selectedCartridge) return;

    const pickupFee = form.pickup_method === "pickup" ? 300 : 0;
    const isLeaking = form.condition === "leaking";
    const isPhysicalDamage = isLeaking; // leaking implies physical damage

    const colorType = selectedCartridge.isColor ? "colour" : "black";
    const derivedEligibility = deriveRefillEligibility(form.condition, selectedCartridge.isColor);

    if (derivedEligibility === "not_recommended") {
      setStep("rejected");
      return;
    }

    const conditionData: ConditionData = {
      is_original: true,
      refilled_before: false,
      physical_damage: isPhysicalDamage,
      leakage: isLeaking,
      color_type: colorType,
      print_issue: form.condition || "",
      urgency: "standard",
    };

    const printerInfo = `Printer: ${selectedPrinter.brand} ${selectedPrinter.model}. Cartridge: ${selectedCartridge.code} (${colorType}). Condition: ${form.condition || "not specified"}.`;
    const enrichedNotes = buildConditionNotes(form.condition, printerInfo, form.notes);

    createRefill.mutate({
      brand: selectedPrinter.brand,
      printer_model_id: null,
      cartridge_code: form.selected_code,
      quantity: parseInt(form.quantity) || 1,
      pickup_method: form.pickup_method,
      address_text: form.address,
      phone: form.phone,
      notes: enrichedNotes,
      service_fee: 800,
      pickup_fee: pickupFee,
      total: 800 + pickupFee,
      condition_data: conditionData,
      derived_eligibility: derivedEligibility,
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
                {PROCESS_STEPS.map((s) => (
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

                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Only eligible ink cartridges are shown. Toner and ink-tank printers are not available for this service.
                  </p>
                </CardContent>
              </Card>

              <Link to="/consumables/refill/track" className="block mt-3">
                <Button variant="outline" size="sm" className="w-full text-xs">Track Existing Refill Order</Button>
              </Link>
            </motion.div>
          )}

          {/* STEP: Cartridge Results */}
          {step === "results" && selectedPrinter && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="mb-1">
                <p className="text-sm text-muted-foreground">Refillable cartridges for</p>
                <p className="text-base font-semibold text-foreground">
                  {selectedPrinter.brand} {selectedPrinter.model}
                </p>
              </div>

              {selectedCartridges.map((cartridge, i) => (
                <motion.div key={cartridge.code + cartridge.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex gap-3 p-4">
                        <div className="w-20 h-20 rounded-lg bg-muted/30 border border-border flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={smartfixInkBox} alt={`${cartridge.code} cartridge`} className="w-16 h-16 object-contain" />
                        </div>
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
                            Bring or send your empty eligible cartridge for refill
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

              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setStep("select"); setSelectedCartridges([]); setSelectedPrinter(null); setSelectedCartridge(null); }}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Change Printer
              </Button>
            </motion.div>
          )}

          {/* STEP: Refill Request Form */}
          {step === "request" && selectedPrinter && selectedCartridge && (
            <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-foreground mb-1">Refill Request</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{selectedPrinter.brand} {selectedPrinter.model}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px]">{selectedCartridge.code}</Badge>
                      <Badge variant={selectedCartridge.isColor ? "secondary" : "default"} className="text-[10px]">
                        {selectedCartridge.isColor ? "Colour" : "Black"}
                      </Badge>
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
                    <Label className="text-xs font-medium">Cartridge Condition</Label>
                    <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                      <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.condition === "leaking" && (
                      <p className="text-[10px] text-destructive mt-1">
                        ⚠ Leaking cartridges may not be eligible for refill. Our team will inspect and advise.
                      </p>
                    )}
                    {form.condition === "not_detected" && (
                      <p className="text-[10px] text-orange-600 mt-1">
                        ⚠ Cartridge not detected may indicate chip damage. Inspection required before refill.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Quantity</Label>
                    <Input type="number" min="1" max="10" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Additional Notes</Label>
                    <Textarea placeholder="Any issues or special instructions" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} maxLength={500} />
                  </div>

                  {/* Order Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
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
                    <Button variant="outline" onClick={() => { setStep("select"); setSelectedBrand(""); setSelectedModel(""); setSelectedCartridge(null); }}>
                      Submit Another Refill
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP: Rejected — cartridge not recommended for refill */}
          {step === "rejected" && (
            <motion.div key="rejected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-7 h-7 text-destructive" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-1">Refill Not Recommended</h2>
                  <p className="text-sm text-muted-foreground mb-2">
                    Based on the reported condition ({form.condition || "unknown"}), this cartridge is not recommended for refill.
                  </p>
                  <p className="text-xs text-muted-foreground mb-5">
                    {form.condition === "leaking"
                      ? "Leaking cartridges may have internal damage that prevents a safe refill."
                      : "This condition requires professional assessment before refill."}
                  </p>

                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">Consider these alternatives</p>
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" onClick={() => navigate("/consumables/compatible")}>
                      <ShieldCheck className="w-4 h-4 mr-1.5" /> View SmartFix Compatible Replacement
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate("/consumables/oem")}>
                      <Droplets className="w-4 h-4 mr-1.5" /> View Genuine OEM Replacement
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={whatsappLink(SUPPORT_WHATSAPP, `Hi LankaFix, my ${selectedCartridge?.code || "cartridge"} is ${form.condition}. Can you help me find a replacement or alternative?`)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp LankaFix for Help
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" className="mt-1" onClick={() => { setStep("request"); setForm(prev => ({ ...prev, condition: "" })); }}>
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Change Condition & Try Again
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
