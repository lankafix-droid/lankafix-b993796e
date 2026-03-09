import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, MapPin, Wrench, Calendar, Shield, CheckCircle2, Phone,
  Mail, Users, ClipboardList, CreditCard, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";

const CORPORATE_PLANS = [
  {
    name: "Office Essential",
    target: "Small offices (5-20 employees)",
    price: "LKR 15,000/mo",
    includes: ["AC maintenance (quarterly)", "IT support (on-demand)", "Electrical safety checks", "Priority dispatch", "Dedicated account manager"],
    popular: false,
  },
  {
    name: "Business Pro",
    target: "Medium businesses (20-100 employees)",
    price: "LKR 45,000/mo",
    includes: ["All Office Essential services", "CCTV maintenance", "Network management", "Plumbing maintenance", "Monthly reporting", "4-hour SLA guarantee"],
    popular: true,
  },
  {
    name: "Enterprise",
    target: "Large organizations (100+ employees)",
    price: "Custom",
    includes: ["All Business Pro services", "Multi-location management", "Dedicated technician team", "24/7 emergency support", "Custom SLA", "Quarterly business reviews"],
    popular: false,
  },
];

const TARGET_INDUSTRIES = [
  { icon: Building2, label: "Offices", count: "120+ served" },
  { icon: Building2, label: "Hotels", count: "35+ served" },
  { icon: Building2, label: "Schools", count: "48+ served" },
  { icon: Building2, label: "Factories", count: "22+ served" },
  { icon: Building2, label: "Retail Chains", count: "67+ served" },
  { icon: Building2, label: "Hospitals", count: "15+ served" },
];

const CorporateServicesPage = () => {
  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    employees: "", locations: "", services: "", notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.contactName || !form.phone) {
      toast.error("Please fill in required fields");
      return;
    }
    setSubmitted(true);
    toast.success("Corporate enquiry submitted!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="gap-1 text-primary border-primary/30">
            <Building2 className="w-3 h-3" /> Corporate Solutions
          </Badge>
          <h1 className="text-3xl font-bold text-foreground">
            Technical Services for Your Business
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            One platform to manage all technical maintenance across your offices,
            branches, and facilities. Verified technicians, transparent pricing, SLA guarantees.
          </p>
        </div>

        {/* Industries */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {TARGET_INDUSTRIES.map((ind) => (
            <Card key={ind.label} className="text-center">
              <CardContent className="p-4">
                <ind.icon className="w-6 h-6 text-primary mx-auto" />
                <p className="text-xs font-medium text-foreground mt-2">{ind.label}</p>
                <p className="text-[10px] text-muted-foreground">{ind.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plans */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground text-center">Corporate Plans</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {CORPORATE_PLANS.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? "border-primary ring-1 ring-primary/20" : ""}`}>
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{plan.target}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-2xl font-bold text-primary">{plan.price}</div>
                  <ul className="space-y-2">
                    {plan.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full gap-2"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => {
                      document.getElementById("enquiry-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: Shield, label: "SLA Guaranteed", desc: "4-hour response time for critical issues" },
            { icon: ClipboardList, label: "Monthly Reports", desc: "Detailed maintenance analytics" },
            { icon: CreditCard, label: "Consolidated Billing", desc: "One invoice for all locations" },
            { icon: Users, label: "Dedicated Team", desc: "Assigned technicians who know your setup" },
          ].map((b) => (
            <Card key={b.label}>
              <CardContent className="p-4 text-center space-y-2">
                <b.icon className="w-6 h-6 text-primary mx-auto" />
                <p className="text-sm font-medium text-foreground">{b.label}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enquiry Form */}
        <Card id="enquiry-form">
          <CardHeader>
            <CardTitle className="text-base">Corporate Enquiry</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
                <h3 className="text-lg font-bold text-foreground">Enquiry Submitted!</h3>
                <p className="text-sm text-muted-foreground">
                  Our corporate team will contact you within 24 hours to discuss your requirements.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Company Name *</label>
                  <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="ABC Holdings (Pvt) Ltd" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Contact Person *</label>
                  <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@company.lk" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Phone *</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="077 123 4567" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Number of Employees</label>
                  <Input value={form.employees} onChange={(e) => setForm({ ...form, employees: e.target.value })} placeholder="e.g. 50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Number of Locations</label>
                  <Input value={form.locations} onChange={(e) => setForm({ ...form, locations: e.target.value })} placeholder="e.g. 3" />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Services Needed</label>
                  <Input value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="AC, IT, CCTV, Electrical..." />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Additional Notes</label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Tell us about your requirements..." rows={3} />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" size="lg" className="w-full gap-2">
                    <Building2 className="w-4 h-4" /> Submit Corporate Enquiry
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default CorporateServicesPage;
