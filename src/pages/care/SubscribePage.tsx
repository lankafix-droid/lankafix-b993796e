import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Shield, Plus } from "lucide-react";
import { getPlanById } from "@/data/carePlans";
import { DEVICE_CATEGORY_LABELS, PLAN_TIER_LABELS, PLAN_TIER_COLORS } from "@/types/subscription";
import type { DeviceCategoryCode } from "@/types/subscription";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

const SubscribePage = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { devices, getDevicesByCategory, registerDevice, subscribeToPlan } = useSubscriptionStore();

  const plan = getPlanById(planId || "");

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    deviceName: "", brand: "", model: "", purchaseYear: new Date().getFullYear(),
    installationLocation: "", warrantyStatus: "unknown" as "active" | "expired" | "unknown",
  });

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Plan Not Found</h1>
            <Button asChild><Link to="/care">Browse Plans</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const categoryDevices = getDevicesByCategory(plan.category as DeviceCategoryCode);

  const handleAddDevice = () => {
    if (!deviceForm.deviceName || !deviceForm.brand) {
      toast.error("Please fill device name and brand");
      return;
    }
    const id = registerDevice({
      ...deviceForm,
      category: plan.category as DeviceCategoryCode,
      purchaseYear: deviceForm.purchaseYear,
    });
    setSelectedDeviceId(id);
    setShowAddDevice(false);
    toast.success("Device registered!");
  };

  const handleSubscribe = () => {
    if (!selectedDeviceId) {
      toast.error("Please select or register a device first");
      return;
    }
    const subId = subscribeToPlan(plan.id, selectedDeviceId);
    track("subscription_activated", { planId: plan.id, subscriptionId: subId });
    toast.success("Subscription activated! 🎉");
    navigate("/care/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-lg">
          <Link to="/care" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Plans
          </Link>

          {/* Plan Summary */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={PLAN_TIER_COLORS[plan.tier]}>{PLAN_TIER_LABELS[plan.tier]}</Badge>
                <span className="text-xs text-muted-foreground">{DEVICE_CATEGORY_LABELS[plan.category as DeviceCategoryCode]}</span>
              </div>
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-2xl font-bold text-foreground">LKR {plan.annualPrice.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ year</span></p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Device Selection */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select or Register Device</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryDevices.length > 0 && (
                <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                  <SelectTrigger><SelectValue placeholder="Choose a registered device" /></SelectTrigger>
                  <SelectContent>
                    {categoryDevices.map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.deviceName} — {d.brand} {d.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {!showAddDevice ? (
                <Button variant="outline" className="w-full" onClick={() => setShowAddDevice(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Register New Device
                </Button>
              ) : (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Device Name</Label>
                      <Input placeholder="e.g. Living Room AC" value={deviceForm.deviceName} onChange={(e) => setDeviceForm((f) => ({ ...f, deviceName: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Brand</Label>
                      <Input placeholder="e.g. Samsung" value={deviceForm.brand} onChange={(e) => setDeviceForm((f) => ({ ...f, brand: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Model</Label>
                      <Input placeholder="e.g. AR18" value={deviceForm.model} onChange={(e) => setDeviceForm((f) => ({ ...f, model: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Purchase Year</Label>
                      <Input type="number" value={deviceForm.purchaseYear} onChange={(e) => setDeviceForm((f) => ({ ...f, purchaseYear: parseInt(e.target.value) || 2024 }))} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Location</Label>
                      <Input placeholder="e.g. Living Room" value={deviceForm.installationLocation} onChange={(e) => setDeviceForm((f) => ({ ...f, installationLocation: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddDevice}>Register Device</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddDevice(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscribe CTA */}
          <Button className="w-full" variant="hero" size="xl" onClick={handleSubscribe} disabled={!selectedDeviceId}>
            <Shield className="w-5 h-5 mr-2" /> Activate {PLAN_TIER_LABELS[plan.tier]}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Prevent breakdowns. Extend device life. Powered by verified LankaFix technicians.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SubscribePage;
