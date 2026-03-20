import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RotateCcw, Search, CheckCircle, AlertTriangle, XCircle, Truck, ClipboardCheck, TestTube, PackageCheck } from "lucide-react";
import { useRefillEligibility, useCreateRefillOrder } from "@/hooks/useConsumables";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const REFILL_STEPS = [
  { icon: Truck, label: "Pickup" },
  { icon: ClipboardCheck, label: "Inspect" },
  { icon: RotateCcw, label: "Refill" },
  { icon: TestTube, label: "Test" },
  { icon: PackageCheck, label: "Return" },
];

const ConsumablesRefillPage = () => {
  const [step, setStep] = useState<"search" | "eligibility" | "condition" | "request">("search");
  const [cartridgeCode, setCartridgeCode] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const { data: eligibility, isLoading } = useRefillEligibility(searchCode);
  const createRefill = useCreateRefillOrder();
  const navigate = useNavigate();

  // Condition questions
  const [condition, setCondition] = useState({
    is_original: true,
    refilled_before: false,
    physical_damage: false,
    leakage: false,
    color_type: "black",
    print_issue: "",
    urgency: "standard",
  });

  // Request form
  const [form, setForm] = useState({ phone: "", address: "", pickup_method: "pickup", quantity: "1", notes: "" });

  const handleCheck = () => {
    if (cartridgeCode.trim()) {
      setSearchCode(cartridgeCode.trim());
      setStep("eligibility");
    }
  };

  const handleSubmitRefill = () => {
    if (!form.phone || form.phone.length < 9) { toast.error("Please enter a valid phone number"); return; }
    if (form.pickup_method === "pickup" && !form.address) { toast.error("Please enter pickup address"); return; }

    const rule = eligibility?.[0];
    if (!rule) return;

    const conditionNotes = [
      condition.is_original ? "Original cartridge" : "Not original",
      condition.refilled_before ? "Previously refilled" : "First refill",
      condition.physical_damage ? "Physical damage reported" : null,
      condition.leakage ? "Leakage reported" : null,
      `Color: ${condition.color_type}`,
      condition.print_issue ? `Issue: ${condition.print_issue}` : null,
    ].filter(Boolean).join("; ");

    const pickupFee = form.pickup_method === "pickup" ? 300 : 0;

    createRefill.mutate({
      brand: rule.brand,
      printer_model_id: rule.printer_model_id,
      cartridge_code: rule.cartridge_code,
      quantity: parseInt(form.quantity) || 1,
      pickup_method: form.pickup_method,
      address_text: form.address,
      phone: form.phone,
      notes: `${conditionNotes}. ${form.notes}`.trim(),
      service_fee: 800,
      pickup_fee: pickupFee,
      total: 800 + pickupFee,
      condition_data: {
        is_original: condition.is_original,
        refilled_before: condition.refilled_before,
        physical_damage: condition.physical_damage,
        leakage: condition.leakage,
        color_type: condition.color_type,
        print_issue: condition.print_issue,
        urgency: condition.urgency,
      },
    }, {
      onSuccess: () => navigate("/consumables/refill/track"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <RotateCcw className="w-5 h-5 text-orange-600" />
          <h1 className="text-lg font-bold text-foreground">SmartFix Premium Refill</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Pickup → Inspect → Refill → Test → Return</p>

        {/* Process Steps */}
        <div className="flex items-center justify-between mb-6 px-2">
          {REFILL_STEPS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-[9px] text-muted-foreground text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Track link */}
        <Link to="/consumables/refill/track" className="block mb-4">
          <Button variant="outline" size="sm" className="w-full text-xs">Track Existing Refill Order</Button>
        </Link>

        <AnimatePresence mode="wait">
          {step === "search" && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Check Cartridge Eligibility</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="Enter cartridge code (e.g. HP-680)" value={cartridgeCode}
                      onChange={(e) => setCartridgeCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCheck()} />
                    <Button onClick={handleCheck} size="icon"><Search className="w-4 h-4" /></Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Not all cartridges are refillable. We'll check eligibility first. Refill acceptance is always subject to physical inspection.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "eligibility" && (
            <motion.div key="elig" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Checking eligibility...</p>}
              {eligibility && eligibility.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Not Recommended for Refill</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">This cartridge may not be refillable. Consider a new replacement.</p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/consumables/results?q=" + searchCode)}>
                      View Replacement Options
                    </Button>
                  </CardContent>
                </Card>
              )}
              {eligibility && eligibility.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    {eligibility[0].refill_supported ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-5 h-5 text-accent" />
                          <span className="text-sm font-semibold text-foreground">Eligible for Refill</span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground mb-3">
                          <p>Brand: <span className="font-medium text-foreground">{eligibility[0].brand}</span></p>
                          <p>Code: <span className="font-medium text-foreground">{eligibility[0].cartridge_code}</span></p>
                          <p>Type: <span className="font-medium text-foreground capitalize">{eligibility[0].refill_type}</span></p>
                          <p>Max cycles: <span className="font-medium text-foreground">{eligibility[0].max_recommended_cycles}</span></p>
                          {eligibility[0].caution_text && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded mt-2 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                              <span className="text-[10px] text-orange-700 dark:text-orange-300">{eligibility[0].caution_text}</span>
                            </div>
                          )}
                        </div>
                        <Button className="w-full" onClick={() => setStep("condition")}>Continue to Condition Check</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-semibold text-foreground">Not Recommended</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{eligibility[0].notes}</p>
                        <Button variant="outline" size="sm" onClick={() => navigate("/consumables/results?q=" + searchCode)}>
                          View Replacement Options
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setStep("search"); setSearchCode(""); }}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Search Again
              </Button>
            </motion.div>
          )}

          {step === "condition" && (
            <motion.div key="condition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Cartridge Condition</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Checkbox id="original" checked={condition.is_original} onCheckedChange={(c) => setCondition({ ...condition, is_original: !!c })} />
                      <Label htmlFor="original" className="text-xs">This is the original cartridge (not third-party)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="refilled" checked={condition.refilled_before} onCheckedChange={(c) => setCondition({ ...condition, refilled_before: !!c })} />
                      <Label htmlFor="refilled" className="text-xs">This cartridge has been refilled before</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="damage" checked={condition.physical_damage} onCheckedChange={(c) => setCondition({ ...condition, physical_damage: !!c })} />
                      <Label htmlFor="damage" className="text-xs">There is visible physical damage</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="leakage" checked={condition.leakage} onCheckedChange={(c) => setCondition({ ...condition, leakage: !!c })} />
                      <Label htmlFor="leakage" className="text-xs">There is ink/toner leakage</Label>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Color Type</Label>
                    <Select value={condition.color_type} onValueChange={(v) => setCondition({ ...condition, color_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="cyan">Cyan</SelectItem>
                        <SelectItem value="magenta">Magenta</SelectItem>
                        <SelectItem value="yellow">Yellow</SelectItem>
                        <SelectItem value="tri_color">Tri-Color</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Print Issue (if any)</Label>
                    <Select value={condition.print_issue} onValueChange={(v) => setCondition({ ...condition, print_issue: v })}>
                      <SelectTrigger><SelectValue placeholder="Select if applicable" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="faded">Faded prints</SelectItem>
                        <SelectItem value="streaky">Streaky lines</SelectItem>
                        <SelectItem value="not_printing">Not printing at all</SelectItem>
                        <SelectItem value="smudging">Smudging</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Urgency</Label>
                    <Select value={condition.urgency} onValueChange={(v) => setCondition({ ...condition, urgency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(condition.physical_damage || condition.leakage) && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-orange-700 dark:text-orange-300">
                        Physical damage or leakage may affect refill acceptance. Final decision is made after inspection.
                      </span>
                    </div>
                  )}

                  <Button className="w-full" onClick={() => setStep("request")}>Continue to Request</Button>
                </CardContent>
              </Card>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep("eligibility")}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            </motion.div>
          )}

          {step === "request" && (
            <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Refill Request Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs">Phone *</Label><Input placeholder="07X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label className="text-xs">Address *</Label><Textarea placeholder="Delivery / pickup address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
                  <div>
                    <Label className="text-xs">Collection Method</Label>
                    <Select value={form.pickup_method} onValueChange={(v) => setForm({ ...form, pickup_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">Pickup from My Location</SelectItem>
                        <SelectItem value="dropoff">I'll Drop Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Quantity</Label><Input type="number" min="1" max="10" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                  <div><Label className="text-xs">Additional Notes</Label><Textarea placeholder="Any other details..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

                  <div className="bg-muted rounded-lg p-3 space-y-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Order Summary</p>
                    <p>Refill service fee: LKR 800</p>
                    {form.pickup_method === "pickup" && <p>Pickup fee: LKR 300</p>}
                    <p className="font-semibold text-foreground pt-1 border-t border-border mt-1">Total: LKR {800 + (form.pickup_method === "pickup" ? 300 : 0)}</p>
                    <p className="text-[10px] text-orange-600 mt-2">⚠ Refill acceptance is subject to physical inspection. Full refund if cartridge is rejected.</p>
                  </div>

                  <Button className="w-full" onClick={handleSubmitRefill} disabled={createRefill.isPending}>
                    {createRefill.isPending ? "Submitting..." : "Place Refill Request"}
                  </Button>
                </CardContent>
              </Card>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep("condition")}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesRefillPage;
