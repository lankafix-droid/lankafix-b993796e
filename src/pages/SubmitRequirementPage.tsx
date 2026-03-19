/**
 * /submit/:category — Requirement Submission Flow
 * For project-based / consultation categories (Solar, CCTV, Smart Home).
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/categories";
import { logFallbackDemand } from "@/lib/demandCapture";
import { whatsappLink, SUPPORT_WHATSAPP } from "@/config/contact";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, MessageCircle, Shield, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

const REQUIREMENT_TYPES: Record<string, string[]> = {
  CCTV: ["New Installation", "Camera Upgrade", "System Repair", "Additional Cameras", "NVR/DVR Setup"],
  SOLAR: ["New Solar System", "Panel Maintenance", "Inverter Repair", "System Expansion", "Consultation"],
  SMART_HOME_OFFICE: ["Smart Lighting", "Home Automation", "Office Network", "Security System", "Consultation"],
  default: ["New Installation", "Repair/Service", "Upgrade", "Consultation", "Other"],
};

const BUDGET_RANGES = [
  "Under Rs 25,000",
  "Rs 25,000 – 50,000",
  "Rs 50,000 – 100,000",
  "Rs 100,000 – 250,000",
  "Above Rs 250,000",
  "Need Quote First",
];

const SubmitRequirementPage = () => {
  const { category } = useParams<{ category: string }>();
  const cat = categories.find((c) => c.code === category);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [requirementType, setRequirementType] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const reqTypes = REQUIREMENT_TYPES[category || ""] || REQUIREMENT_TYPES.default;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from("profiles").select("full_name").eq("user_id", user.id).single()
          .then(({ data }) => {
            if (data?.full_name) setName(data.full_name);
          });
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Please fill in your name and phone number");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("demand_requests" as any).insert({
        user_id: userId,
        category_code: category || "UNKNOWN",
        request_type: "submit",
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim() || null,
        description: [requirementType, notes.trim()].filter(Boolean).join(" — ") || null,
        budget_range: budget || null,
        preferred_time: "schedule",
        status: "pending",
        priority: "medium",
        priority_score: 40,
      } as any);

      if (error) throw error;

      logFallbackDemand(category || "UNKNOWN", "request", "submit_page");
      setSubmitted(true);
    } catch (e) {
      console.error("[SubmitRequirement] Failed:", e);
      toast.error("Something went wrong. Please try WhatsApp instead.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!cat) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Category not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Requirement Submitted!</h1>
            <p className="text-muted-foreground mb-6">
              Our team will review your requirement and get back to you with a custom quote.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-lg">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <div className="mb-6">
            <Badge variant="outline" className="mb-2 text-xs bg-accent/50">{cat.name}</Badge>
            <h1 className="text-xl font-bold text-foreground mb-1">Submit Your Requirement</h1>
            <p className="text-sm text-muted-foreground">
              Tell us what you need and we'll provide a custom quote.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
              <Shield className="w-3 h-3 mr-1" /> Free Consultation
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              <FileText className="w-3 h-3 mr-1" /> Custom Quote
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Your name" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Phone *</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="+94 7X XXX XXXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Colombo 7, Kandy" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Requirement Type</label>
              <div className="flex flex-wrap gap-2">
                {reqTypes.map((rt) => (
                  <button key={rt} onClick={() => setRequirementType(rt)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      requirementType === rt ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:border-primary/30"
                    }`}>{rt}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Budget Range</label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_RANGES.map((b) => (
                  <button key={b} onClick={() => setBudget(b)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      budget === b ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:border-primary/30"
                    }`}>{b}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Additional Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none"
                placeholder="Describe your project requirements..." />
            </div>
          </div>

          <Button variant="hero" size="xl" className="w-full mt-6" onClick={handleSubmit}
            disabled={!name.trim() || !phone.trim() || submitting}>
            {submitting ? "Submitting..." : "Submit Requirement"}
          </Button>

          <div className="mt-4 text-center">
            <a href={whatsappLink(SUPPORT_WHATSAPP, `Hi LankaFix, I need a quote for ${cat.name}`)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-4 h-4" /> Or discuss on WhatsApp
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SubmitRequirementPage;
