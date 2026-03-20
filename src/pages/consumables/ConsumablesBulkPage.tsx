import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, CheckCircle } from "lucide-react";
import { useCreateBulkQuote } from "@/hooks/useConsumables";
import { motion } from "framer-motion";

const ConsumablesBulkPage = () => {
  const createQuote = useCreateBulkQuote();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    requester_name: "", organization_name: "", phone: "", email: "",
    product_notes: "", qty: "", oem_preference: "either",
    refill_required: false, recurring_frequency: "", invoice_requirement: "",
  });

  const handleSubmit = () => {
    if (!form.requester_name || !form.phone) return;
    createQuote.mutate({
      ...form,
      qty: parseInt(form.qty) || null,
      request_type: "bulk",
    }, { onSuccess: () => setSubmitted(true) });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <CheckCircle className="w-12 h-12 text-accent mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground mb-1">Quote Request Submitted</h1>
          <p className="text-sm text-muted-foreground mb-4">Our team will contact you within 24 hours.</p>
          <Link to="/consumables"><Button>Back to Consumables</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Link to="/consumables" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Bulk / SME / Tender Supply</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-6">Request a custom quote for volume orders</p>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div><Label className="text-xs">Contact Person *</Label><Input value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} /></div>
            <div><Label className="text-xs">Organization</Label><Input value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Product Requirements</Label><Textarea value={form.product_notes} onChange={(e) => setForm({ ...form, product_notes: e.target.value })} placeholder="Models, codes, quantities..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Quantity</Label><Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></div>
              <div>
                <Label className="text-xs">OEM Preference</Label>
                <Select value={form.oem_preference} onValueChange={(v) => setForm({ ...form, oem_preference: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="either">Either</SelectItem>
                    <SelectItem value="oem_only">OEM Only</SelectItem>
                    <SelectItem value="smartfix_only">SmartFix Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Recurring Frequency</Label><Input value={form.recurring_frequency} onChange={(e) => setForm({ ...form, recurring_frequency: e.target.value })} placeholder="e.g. Monthly, Quarterly" /></div>
            <div><Label className="text-xs">Invoice Requirements</Label><Input value={form.invoice_requirement} onChange={(e) => setForm({ ...form, invoice_requirement: e.target.value })} placeholder="VAT, tender spec, etc." /></div>
            <Button className="w-full" onClick={handleSubmit} disabled={createQuote.isPending}>
              {createQuote.isPending ? "Submitting..." : "Request Quote"}
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ConsumablesBulkPage;
