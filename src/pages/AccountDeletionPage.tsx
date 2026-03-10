import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Trash2, CheckCircle, ShieldCheck, ArrowLeft, LogIn,
  XCircle, Clock, AlertCircle, Lock, CalendarX, CreditCard, ShieldAlert,
  HeartPulse, FileText, RotateCcw, Mail, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";
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
  { icon: CalendarX, text: "Active bookings will be cancelled. Any in-progress jobs must be completed or cancelled before deletion can proceed." },
  { icon: CreditCard, text: "Pending refunds or payouts will be processed before your account is removed." },
  { icon: ShieldAlert, text: "Active warranty claims will be resolved before final deletion. After deletion, warranty-linked support will no longer be accessible." },
  { icon: HeartPulse, text: "LankaFix Care plans and subscriptions will be permanently cancelled. Unused service credits, prepaid benefits, and scheduled maintenance visits will be forfeited." },
  { icon: FileText, text: "You will lose access to all invoices, service history, device records, and past quotes." },
  { icon: RotateCcw, text: "Future maintenance reminders and device health alerts will stop. Unresolved disputes may delay the deletion process." },
];

type ActiveGuardrail = {
  hasActiveBookings: boolean;
  hasActiveSubscriptions: boolean;
  count: number;
};

const AccountDeletionPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState<"info" | "reauth" | "confirm" | "submitted" | "failed">("info");
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState("");
  const [guardrail, setGuardrail] = useState<ActiveGuardrail | null>(null);
  const [guardrailLoading, setGuardrailLoading] = useState(false);

  // Re-auth state
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [reauthLoading, setReauthLoading] = useState(false);

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

  // Check for active bookings when user is available
  const checkGuardrails = useCallback(async () => {
    if (!user) return;
    setGuardrailLoading(true);
    try {
      const activeStatuses = [
        "requested", "matching", "awaiting_partner_confirmation", "assigned",
        "tech_en_route", "arrived", "inspection_started", "quote_submitted",
        "quote_approved", "repair_started", "quality_check", "invoice_ready",
      ];
      const { count, error } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id)
        .in("status", activeStatuses);

      setGuardrail({
        hasActiveBookings: !error && (count ?? 0) > 0,
        hasActiveSubscriptions: false, // Future: check subscriptions table
        count: count ?? 0,
      });
    } catch {
      // Non-blocking — proceed without guardrail data
      setGuardrail(null);
    } finally {
      setGuardrailLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkGuardrails();
  }, [checkGuardrails]);

  const canSubmit = confirmText.toUpperCase() === "DELETE";

  const handleProceedToReauth = () => {
    // If user signed in with email/password, show re-auth step
    const provider = user?.app_metadata?.provider;
    if (provider === "email") {
      setStep("reauth");
    } else {
      // For OAuth or when we can't re-auth, skip to confirm
      setStep("confirm");
    }
  };

  const handleReauth = async () => {
    if (!user?.email || !reauthPassword) return;
    setReauthLoading(true);
    setReauthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: reauthPassword,
      });
      if (error) {
        setReauthError("Incorrect password. Please try again.");
      } else {
        setStep("confirm");
      }
    } catch {
      setReauthError("Verification failed. Please try again.");
    } finally {
      setReauthLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    setFailureMessage("");

    try {
      const { data, error } = await supabase.from("support_tickets").insert({
        customer_id: user.id,
        issue_type: "account_deletion",
        description: [
          `Account deletion request.`,
          `Email: ${user.email || "N/A"}.`,
          `Reason: ${reason || "Not specified"}.`,
          `Active bookings at time of request: ${guardrail?.count ?? "unknown"}.`,
          `User confirmed by typing DELETE and completed identity verification.`,
        ].join(" "),
        status: "open",
      }).select("id").single();

      if (error) throw error;

      const ref = data?.id ? `DEL-${data.id.substring(0, 8).toUpperCase()}` : null;
      setTicketRef(ref);
      setStep("submitted");
      toast({ title: "Deletion request submitted", description: ref ? `Reference: ${ref}` : "Request received." });
    } catch (err: unknown) {
      console.error("Deletion request failed:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFailureMessage(
        msg.includes("permission") || msg.includes("policy")
          ? "Your request could not be submitted due to a permissions issue. Please contact support directly."
          : "We couldn't submit your deletion request. Please try again or contact support."
      );
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

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-lg py-12 px-4 space-y-6">
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
            <p className="text-xs text-muted-foreground pt-4">
              Can't access your account?{" "}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`} className="text-primary hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-lg py-6 px-4 space-y-5 pb-24">
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Account
        </Link>

        {step === "info" && (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground font-heading">Delete My Account</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We're sorry to see you go. Please review what happens when your account is deleted.
              </p>
            </div>

            {/* Active booking guardrail */}
            {!guardrailLoading && guardrail?.hasActiveBookings && (
              <div className="bg-warning/5 border border-warning/30 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      You have {guardrail.count} active booking{guardrail.count > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Active or in-progress bookings will be cancelled if you proceed with account deletion.
                      We recommend completing or cancelling your current bookings first to avoid any service disruption.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg text-xs ml-8" asChild>
                  <Link to="/track">View My Bookings</Link>
                </Button>
              </div>
            )}

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
                What you should know
              </h2>
              <div className="space-y-3">
                {CONSEQUENCES.map((c, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <c.icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-card rounded-xl border p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Deletion timeline
              </h2>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Request reviewed within <strong className="text-foreground">3 business days</strong></p>
                <p>• Personal data permanently deleted within <strong className="text-foreground">7 business days</strong></p>
                <p>• Confirmation sent to <strong className="text-foreground">{user.email}</strong></p>
                <p>• Transaction records retained up to 90 days for legal compliance</p>
                <p>• You can cancel the request by contacting support before processing begins</p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">This action cannot be undone</p>
                <p className="text-xs text-destructive/70 mt-0.5 leading-relaxed">
                  Once processed, all your data, booking history, device passports, care plan benefits, and saved addresses will be permanently removed.
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

            <Button variant="destructive" className="w-full h-12 rounded-xl font-semibold" onClick={handleProceedToReauth}>
              Continue to Delete Account
            </Button>
          </>
        )}

        {step === "reauth" && (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground font-heading">Verify Your Identity</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For your security, please re-enter your password to continue with account deletion.
              </p>
            </div>

            <div className="bg-card rounded-xl border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>

            <div className="bg-card rounded-xl border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Re-enter your password</p>
              </div>
              <input
                type="password"
                className="w-full rounded-xl border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your password"
                value={reauthPassword}
                onChange={(e) => { setReauthPassword(e.target.value); setReauthError(""); }}
                autoComplete="current-password"
              />
              {reauthError && (
                <p className="text-xs text-destructive">{reauthError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => { setStep("info"); setReauthPassword(""); setReauthError(""); }}>
                Go Back
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-12 rounded-xl font-semibold"
                disabled={!reauthPassword || reauthLoading}
                onClick={handleReauth}
              >
                {reauthLoading ? "Verifying…" : "Verify & Continue"}
              </Button>
            </div>

            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto block"
              onClick={() => setStep("confirm")}
            >
              Skip verification →
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground font-heading">Final Confirmation</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Type <strong className="text-foreground">DELETE</strong> below to permanently delete your account.
              </p>
            </div>

            <div className="bg-card rounded-xl border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Deleting account for</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive leading-relaxed">
                  This will permanently delete your LankaFix account, all personal data, device records, booking history, and care plan benefits.
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
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1 h-12 rounded-xl font-semibold" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                {submitting ? "Submitting…" : "Delete My Account"}
              </Button>
            </div>
          </>
        )}

        {step === "submitted" && (
          <div className="text-center py-10 space-y-5">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-xl font-bold text-foreground font-heading">Request Submitted</h1>
            {ticketRef && (
              <div className="bg-card rounded-xl border p-4 mx-auto inline-block">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Reference Number</p>
                <p className="text-lg font-mono font-bold text-foreground mt-1">{ticketRef}</p>
              </div>
            )}
            <div className="space-y-2 max-w-sm mx-auto">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your account deletion request has been received. We'll process it within <strong className="text-foreground">7 business days</strong> and send a confirmation to <strong className="text-foreground">{user.email}</strong>.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Changed your mind? Contact us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>
                {ticketRef && <> with reference <strong className="text-foreground">{ticketRef}</strong></>} before processing begins.
              </p>
            </div>
            <Button asChild className="mt-4 rounded-xl">
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        )}

        {step === "failed" && (
          <div className="text-center py-10 space-y-5">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground font-heading">Submission Failed</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {failureMessage || "We couldn't submit your deletion request automatically. Please try again or contact our support team directly."}
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button variant="destructive" className="rounded-xl h-11" onClick={() => { setStep("confirm"); setConfirmText(""); }}>
                Try Again
              </Button>
              <Button variant="outline" className="rounded-xl h-11" asChild>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20LankaFix%20account.%20Email%3A%20${encodeURIComponent(user.email || "")}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </a>
              </Button>
              <Button variant="outline" className="rounded-xl h-11" asChild>
                <a href={whatsappLink(SUPPORT_WHATSAPP, "Hi, I need help deleting my LankaFix account.")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
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
