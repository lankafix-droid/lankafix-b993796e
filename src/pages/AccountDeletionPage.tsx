import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, CheckCircle, ShieldCheck, ArrowLeft, LogIn, XCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const DATA_ITEMS = [
  { label: "Account information", desc: "Name, email, phone number", deleted: true },
  { label: "Saved addresses", desc: "All stored locations", deleted: true },
  { label: "Device passports", desc: "Registered devices and health data", deleted: true },
  { label: "Booking preferences", desc: "Saved preferences and history", deleted: true },
  { label: "Transaction records", desc: "Invoices and payment history", deleted: false, reason: "Retained for 90 days for tax and legal compliance" },
  { label: "Warranty claims", desc: "Active warranty documentation", deleted: false, reason: "Retained until warranty period expires" },
];

const CONSEQUENCES = [
  "Any active bookings will be cancelled automatically.",
  "Pending refunds or payouts will be processed before account removal.",
  "Active warranty claims will be resolved before final deletion.",
  "Active care plans or subscriptions will be terminated.",
  "You will lose access to all invoices, service history, and device records.",
  "Unresolved disputes may delay the deletion process.",
];

const AccountDeletionPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState<"info" | "confirm" | "submitted" | "failed">("info");
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const canSubmit = confirmText.toUpperCase() === "DELETE";

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.from("support_tickets").insert({
        customer_id: user.id,
        issue_type: "account_deletion",
        description: `Account deletion request. Reason: ${reason || "Not specified"}. User confirmed by typing DELETE. Email: ${user.email || "N/A"}.`,
        status: "open",
      }).select("id").single();

      if (error) throw error;

      const ref = data?.id ? `DEL-${data.id.substring(0, 8).toUpperCase()}` : null;
      setTicketRef(ref);
      setStep("submitted");
      toast({ title: "Deletion request submitted", description: `Reference: ${ref}` });
    } catch (err) {
      console.error("Deletion request failed:", err);
      setStep("failed");
      toast({ title: "Submission failed", description: "Please try again or contact support.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-lg py-12 space-y-6">
          <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Account
          </Link>
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <LogIn className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground font-heading">Sign In Required</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Please sign in to manage your account deletion request. We need to verify your identity before processing any account changes.
            </p>
            <Button className="rounded-xl mt-2" onClick={() => navigate("/account")}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-lg py-6 space-y-6">
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Account
        </Link>

        {step === "info" && (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground font-heading">Delete My Account</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We're sorry to see you go. Before proceeding, please review what happens when your account is deleted.
              </p>
            </div>

            {/* What gets deleted */}
            <div className="bg-card rounded-xl border p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">What happens to your data</h2>
              <div className="space-y-3">
                {DATA_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.deleted ? "bg-destructive/10" : "bg-warning/10"}`}>
                      {item.deleted ? <Trash2 className="w-3 h-3 text-destructive" /> : <ShieldCheck className="w-3 h-3 text-warning" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                      {!item.deleted && <p className="text-[11px] text-warning mt-0.5">{item.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational consequences */}
            <div className="bg-card rounded-xl border p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                Before you proceed
              </h2>
              <ul className="space-y-2">
                {CONSEQUENCES.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-warning mt-0.5">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Timeline */}
            <div className="bg-card rounded-xl border p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Deletion timeline
              </h2>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Your request will be reviewed within <strong className="text-foreground">3 business days</strong>.</p>
                <p>• Personal data is permanently deleted within <strong className="text-foreground">7 business days</strong>.</p>
                <p>• You'll receive a confirmation email at <strong className="text-foreground">{user.email}</strong> once deletion is complete.</p>
                <p>• Some transaction records may be retained for up to 90 days for legal compliance.</p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">This action cannot be undone</p>
                <p className="text-xs text-destructive/70 mt-0.5">
                  Once your account is deleted, all your data, booking history, device passports, and saved addresses will be permanently removed.
                </p>
              </div>
            </div>

            {/* Optional reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Why are you leaving? (optional)</label>
              <textarea
                className="w-full rounded-xl border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Help us improve by sharing your reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
            </div>

            <Button variant="destructive" className="w-full h-12 rounded-xl font-semibold" onClick={() => setStep("confirm")}>
              Continue to Delete Account
            </Button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground font-heading">Confirm Account Deletion</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To confirm, please type <strong className="text-foreground">DELETE</strong> in the field below.
              </p>
            </div>

            <div className="bg-card rounded-xl border p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
                <p className="text-sm font-medium text-destructive">
                  This will permanently delete your LankaFix account and all associated data.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Type DELETE to confirm</label>
                <input
                  type="text"
                  className="w-full rounded-xl border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive font-mono tracking-wider"
                  placeholder="DELETE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  maxLength={6}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => { setStep("info"); setConfirmText(""); }}>
                Go Back
              </Button>
              <Button variant="destructive" className="flex-1 h-12 rounded-xl font-semibold" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                {submitting ? "Submitting…" : "Delete My Account"}
              </Button>
            </div>
          </>
        )}

        {step === "submitted" && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-xl font-bold text-foreground font-heading">Request Submitted</h1>
            {ticketRef && (
              <div className="bg-card rounded-xl border p-4 inline-block mx-auto">
                <p className="text-xs text-muted-foreground">Reference Number</p>
                <p className="text-lg font-mono font-bold text-foreground mt-1">{ticketRef}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your account deletion request has been received. We'll process it within 7 business days and send a confirmation email to <strong className="text-foreground">{user.email}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              Need help? Contact us at{" "}
              <a href="mailto:hello@lankafix.lk" className="text-primary hover:underline">hello@lankafix.lk</a>
              {ticketRef && <> and reference <strong>{ticketRef}</strong></>}.
            </p>
            <Button asChild className="mt-4 rounded-xl">
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        )}

        {step === "failed" && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground font-heading">Submission Failed</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              We couldn't submit your deletion request automatically. Please try again or contact our support team directly.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button variant="destructive" className="rounded-xl" onClick={() => { setStep("confirm"); setConfirmText(""); }}>
                Try Again
              </Button>
              <Button variant="outline" className="rounded-xl" asChild>
                <a href="mailto:hello@lankafix.lk?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20LankaFix%20account.%20Email%3A%20{user.email}">
                  Email Support Instead
                </a>
              </Button>
              <Button variant="outline" className="rounded-xl" asChild>
                <a href="https://wa.me/94701234567?text=Hi%2C%20I%20need%20help%20deleting%20my%20LankaFix%20account." target="_blank" rel="noopener noreferrer">
                  WhatsApp Support
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AccountDeletionPage;
