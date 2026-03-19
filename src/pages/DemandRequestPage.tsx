/**
 * /request/:category — Callback/Request Flow
 * Captures demand when no supply is available for a category.
 */
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/categories";
import { logFallbackDemand } from "@/lib/demandCapture";
import { whatsappLink, SUPPORT_WHATSAPP } from "@/config/contact";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Phone, MessageCircle, Shield, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

const PREFERRED_TIMES = [
  { value: "asap", label: "ASAP", si: "හැකි ඉක්මනින්" },
  { value: "today", label: "Today", si: "අද" },
  { value: "tomorrow", label: "Tomorrow", si: "හෙට" },
  { value: "schedule", label: "Schedule Later", si: "පසුව" },
];

const DemandRequestPage = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const cat = categories.find((c) => c.code === category);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [preferredTime, setPreferredTime] = useState("asap");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        // Auto-fill name from profile
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
        request_type: "callback",
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        preferred_time: preferredTime,
        status: "pending",
        priority: preferredTime === "asap" ? "high" : "medium",
        priority_score: preferredTime === "asap" ? 80 : 50,
      } as any);

      if (error) throw error;

      logFallbackDemand(category || "UNKNOWN", "callback", "request_page");
      setSubmitted(true);
    } catch (e) {
      console.error("[DemandRequest] Submit failed:", e);
      toast.error("Something went wrong. Please try WhatsApp instead.");
    } finally {
      setSubmitting(false);
    }
  };

  const waMessage = `Hi LankaFix, I need help with ${cat?.name || category}\nLocation: ${location || "Not specified"}`;

  if (!cat) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Category not found</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Request Submitted!</h1>
            <p className="text-muted-foreground mb-2">
              Our team will call you back within <strong>15–30 minutes</strong>.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              ඔබේ ඉල්ලීම සාර්ථකව ලැබුණි. අපි ඉක්මනින් ඔබට කතා කරමු.
            </p>

            <div className="flex flex-col gap-3">
              <Button asChild variant="outline" size="lg" className="w-full">
                <a href={whatsappLink(SUPPORT_WHATSAPP, waMessage)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" /> Chat on WhatsApp Instead
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
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
            <h1 className="text-xl font-bold text-foreground mb-1">Request a Callback</h1>
            <p className="text-sm text-muted-foreground">
              We'll arrange a verified technician for you.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ඔබගේ ඉල්ලීම අපට යවන්න — අපි විසඳුමක් සොයනවා.
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
              <Shield className="w-3 h-3 mr-1" /> Verified LankaFix Support
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              <Clock className="w-3 h-3 mr-1" /> Fast Callback 15–30 mins
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="+94 7X XXX XXXX"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Nugegoda, Colombo 5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">What do you need help with?</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none"
                placeholder={`Describe your ${cat.name.toLowerCase()} issue...`}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">When do you need this?</label>
              <div className="grid grid-cols-2 gap-2">
                {PREFERRED_TIMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setPreferredTime(t.value)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                      preferredTime === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground hover:border-primary/30"
                    }`}
                  >
                    <div>{t.label}</div>
                    <div className="text-[10px] opacity-70">{t.si}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            variant="hero"
            size="xl"
            className="w-full mt-6"
            onClick={handleSubmit}
            disabled={!name.trim() || !phone.trim() || submitting}
          >
            {submitting ? "Submitting..." : "Request Callback"}
          </Button>

          {/* WhatsApp alternative */}
          <div className="mt-4 text-center">
            <a
              href={whatsappLink(SUPPORT_WHATSAPP, waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => logFallbackDemand(category || "UNKNOWN", "chat", "request_page")}
            >
              <MessageCircle className="w-4 h-4" />
              Or chat on WhatsApp instead
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DemandRequestPage;
