import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Shield, Info, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPlanById } from "@/data/spsPlans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SPSRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("plan") || "";
  const plan = getPlanById(planId);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "", mobile: "", email: "", nicOrCompany: "",
    location: "", notes: "", preferredDate: "",
  });
  const [agreed, setAgreed] = useState(false);

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!agreed || !form.fullName || !form.mobile) {
      toast({ title: "Please fill required fields and accept agreement", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in to submit a subscription request", variant: "destructive" });
        navigate("/login");
        return;
      }
      const { error } = await supabase.from("sps_subscription_requests" as any).insert({
        customer_id: user.id,
        submitted_plan_id: plan?.id || null,
        full_name: form.fullName,
        mobile: form.mobile,
        email: form.email || null,
        nic_or_company: form.nicOrCompany || null,
        location: form.location || null,
        notes: form.notes || null,
        preferred_install_date: form.preferredDate || null,
        request_status: "submitted",
        fit_confidence: "recommended",
      } as any);
      if (error) throw error;
      toast({ title: "Request submitted!", description: "Our team will review and contact you within 24 hours." });
      navigate("/sps/dashboard");
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold">Subscription Request</h1>
            <p className="text-xs text-muted-foreground">Step {step} of 2</p>
          </div>
        </div>

        {/* Step 1: Contact Details */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="text-xs font-semibold text-foreground">Your Details</div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
                  <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Your full name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Mobile *</label>
                  <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="07X XXXX XXX" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" type="email" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">NIC / Company Reg</label>
                  <Input value={form.nicOrCompany} onChange={(e) => set("nicOrCompany", e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Delivery Address / Location</label>
                  <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Your address in Colombo" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Preferred Install Date</label>
                  <Input value={form.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} type="date" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                  <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any special requirements" />
                </div>
              </CardContent>
            </Card>
            <Button className="w-full" onClick={() => setStep(2)} disabled={!form.fullName || !form.mobile}>
              Review & Submit <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="space-y-4">
            {plan && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="text-xs font-medium text-primary mb-1">Selected Plan</div>
                  <div className="text-lg font-bold text-foreground">{plan.plan_name}</div>
                  {!plan.is_custom_quote && (
                    <div className="text-sm text-primary font-bold">Rs. {plan.monthly_fee.toLocaleString()}/mo</div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div><span className="text-muted-foreground">Pages:</span> {plan.included_pages.toLocaleString()}</div>
                    <div><span className="text-muted-foreground">Deposit:</span> Rs. {plan.deposit_amount.toLocaleString()}</div>
                    <div><span className="text-muted-foreground">Setup:</span> Rs. {plan.setup_fee.toLocaleString()}</div>
                    <div><span className="text-muted-foreground">Term:</span> {plan.min_term_months} months</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="font-semibold text-foreground">Your Details</div>
                <div><span className="text-muted-foreground">Name:</span> {form.fullName}</div>
                <div><span className="text-muted-foreground">Mobile:</span> {form.mobile}</div>
                {form.email && <div><span className="text-muted-foreground">Email:</span> {form.email}</div>}
                {form.location && <div><span className="text-muted-foreground">Location:</span> {form.location}</div>}
              </CardContent>
            </Card>

            {/* Agreement */}
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
                  <Shield className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    By submitting, you agree to LankaFix SPS terms. Your request will be reviewed by our team.
                    Deposit is refundable subject to inspection. No auto-charges until contract activation.
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded border-border" />
                  <span className="text-xs text-foreground font-medium">I acknowledge and accept</span>
                </label>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!agreed || submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Submit Request</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
