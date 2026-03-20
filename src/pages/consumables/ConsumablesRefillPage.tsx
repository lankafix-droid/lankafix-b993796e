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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RotateCcw, Search, CheckCircle, AlertTriangle, XCircle, Truck, ClipboardCheck, TestTube, PackageCheck } from "lucide-react";
import { useRefillEligibility, useCreateRefillOrder } from "@/hooks/useConsumables";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const REFILL_STEPS = [
  { icon: Truck, label: "Pickup / Drop-off" },
  { icon: ClipboardCheck, label: "Inspect" },
  { icon: RotateCcw, label: "Refill" },
  { icon: TestTube, label: "Test" },
  { icon: PackageCheck, label: "Return" },
];

const ConsumablesRefillPage = () => {
  const [step, setStep] = useState<"search" | "eligibility" | "request">("search");
  const [cartridgeCode, setCartridgeCode] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const { data: eligibility, isLoading } = useRefillEligibility(searchCode);
  const createRefill = useCreateRefillOrder();
  const navigate = useNavigate();

  // Request form
  const [form, setForm] = useState({ phone: "", address: "", pickup_method: "pickup", quantity: "1", notes: "" });

  const handleCheck = () => {
    if (cartridgeCode.trim()) {
      setSearchCode(cartridgeCode.trim());
      setStep("eligibility");
    }
  };

  const handleSubmitRefill = () => {
    const rule = eligibility?.[0];
    if (!rule) return;
    createRefill.mutate({
      user_id: "00000000-0000-0000-0000-000000000000", // Will be replaced by auth
      brand: rule.brand,
      printer_model_id: rule.printer_model_id,
      cartridge_code: rule.cartridge_code,
      quantity: parseInt(form.quantity) || 1,
      pickup_method: form.pickup_method,
      address_text: form.address,
      phone: form.phone,
      notes: form.notes,
      service_fee: 800,
      pickup_fee: form.pickup_method === "pickup" ? 300 : 0,
      total: 800 + (form.pickup_method === "pickup" ? 300 : 0),
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
          {REFILL_STEPS.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-[9px] text-muted-foreground text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

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
                    Not all cartridges are refillable. We'll check eligibility first.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "eligibility" && (
            <motion.div key="elig" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Checking...</p>}
              {eligibility && eligibility.length === 0 && (
                <Card>
                  <CardContent className="p-4 text-center">
                    <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm font-medium">Not Recommended for Refill</p>
                    <p className="text-xs text-muted-foreground mt-1">This cartridge may not be refillable. Consider a new replacement.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/consumables/results?q=" + searchCode)}>
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
                          <p>Brand: {eligibility[0].brand}</p>
                          <p>Code: {eligibility[0].cartridge_code}</p>
                          <p>Type: {eligibility[0].refill_type}</p>
                          <p>Max cycles: {eligibility[0].max_recommended_cycles}</p>
                          {eligibility[0].caution_text && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded mt-2 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                              <span className="text-[10px] text-orange-700 dark:text-orange-300">{eligibility[0].caution_text}</span>
                            </div>
                          )}
                        </div>
                        <Button className="w-full" onClick={() => setStep("request")}>Continue Refill Request</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-semibold text-foreground">Not Recommended</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{eligibility[0].notes}</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/consumables/results?q=" + searchCode)}>
                          View Replacement Options
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep("search")}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Search Again
              </Button>
            </motion.div>
          )}

          {step === "request" && (
            <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Refill Request</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs">Phone</Label><Input placeholder="07X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label className="text-xs">Address</Label><Textarea placeholder="Delivery / pickup address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
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
                  <div><Label className="text-xs">Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                  <div><Label className="text-xs">Notes (optional)</Label><Textarea placeholder="Any condition details..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

                  <div className="bg-muted rounded-lg p-3 space-y-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Summary</p>
                    <p>Refill service fee: LKR 800</p>
                    {form.pickup_method === "pickup" && <p>Pickup fee: LKR 300</p>}
                    <p className="font-semibold text-foreground">Total: LKR {800 + (form.pickup_method === "pickup" ? 300 : 0)}</p>
                    <p className="text-[10px] text-orange-600 mt-2">⚠ Refill acceptance subject to inspection. Full refund if cartridge is rejected.</p>
                  </div>

                  <Button className="w-full" onClick={handleSubmitRefill} disabled={createRefill.isPending}>
                    {createRefill.isPending ? "Submitting..." : "Place Refill Request"}
                  </Button>
                </CardContent>
              </Card>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep("eligibility")}>
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
