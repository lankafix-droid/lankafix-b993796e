import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import PageTransition from "@/components/motion/PageTransition";
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
import { motion } from "framer-motion";

const DATA_ITEMS = [
  { label: "Account information", deleted: true },
  { label: "Saved addresses", deleted: true },
  { label: "Device passports", deleted: true },
  { label: "Booking preferences", deleted: true },
  { label: "Transaction records", deleted: false, reason: "Retained 90 days (legal)" },
  { label: "Warranty claims", deleted: false, reason: "Retained until expiry" },
];

const CONSEQUENCES = [
  { icon: CalendarX, text: "Active bookings will be cancelled" },
  { icon: CreditCard, text: "Pending refunds will be processed first" },
  { icon: HeartPulse, text: "Care plans and prepaid benefits are forfeited" },
  { icon: RotateCcw, text: "Device reminders and alerts will stop" },
];

type ActiveGuardrail = { hasActiveBookings: boolean; hasActiveSubscriptions: boolean; count: number };

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
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [reauthLoading, setReauthLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setAuthLoading(false); });
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); setAuthLoading(false); });
    return () => subscription.unsubscribe();
  }, []);

  const checkGuardrails = useCallback(async () => {
    if (!user) return;
    setGuardrailLoading(true);
    try {
      const activeStatuses = ["requested", "matching", "awaiting_partner_confirmation", "assigned", "tech_en_route", "arrived", "inspection_started", "quote_submitted", "quote_approved", "repair_started", "quality_check", "invoice_ready"] as const;
      const { count, error } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", user.id).in("status", [...activeStatuses]);
      setGuardrail({ hasActiveBookings: !error && (count ?? 0) > 0, hasActiveSubscriptions: false, count: count ?? 0 });
    } catch { setGuardrail(null); } finally { setGuardrailLoading(false); }
  }, [user]);

  useEffect(() => { checkGuardrails(); }, [checkGuardrails]);

  const canSubmit = confirmText.toUpperCase() === "DELETE";

  const handleProceedToReauth = () => {
    const provider = user?.app_metadata?.provider;
    setStep(provider === "email" ? "reauth" : "confirm");
  };

  const handleReauth = async () => {
    if (!user?.email || !reauthPassword) return;
    setReauthLoading(true); setReauthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: reauthPassword });
      if (error) setReauthError("Incorrect password. Please try again.");
      else setStep("confirm");
    } catch { setReauthError("Verification failed. Please try again."); } finally { setReauthLoading(false); }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true); setFailureMessage("");
    try {
      const { data, error } = await supabase.from("support_tickets").insert({
        customer_id: user.id, issue_type: "account_deletion",
        description: `Account deletion request. Email: ${user.email || "N/A"}. Reason: ${reason || "Not specified"}. Active bookings: ${guardrail?.count ?? "unknown"}. User confirmed by typing DELETE.`,
        status: "open",
      }).select("id").single();
      if (error) throw error;
      const ref = data?.id ? `DEL-${data.id.substring(0, 8).toUpperCase()}` : null;
      setTicketRef(ref); setStep("submitted");
      toast({ title: "Deletion request submitted", description: ref ? `Reference: ${ref}` : "Request received." });
    } catch (err: unknown) {
      console.error("Deletion request failed:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFailureMessage(msg.includes("permission") || msg.includes("policy") ? "Your request could not be submitted due to a permissions issue. Please contact support directly." : "We couldn't submit your deletion request. Please try again or contact support.");
      setStep("failed");
      toast({ title: "Submission failed", description: "Please try again or contact support.", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" /></main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <PageTransition className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-lg py-8 px-4 pb-28">
          <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <LogIn className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Sign In Required</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">Please sign in to manage your account deletion request.</p>
            <Button className="rounded-xl" onClick={() => navigate("/account")}><LogIn className="w-4 h-4 mr-2" /> Sign In</Button>
            <p className="text-xs text-muted-foreground pt-4">Can't access your account? <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`} className="text-primary hover:underline">Contact support</a></p>
          </div>
        </main>
        <Footer />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-lg py-5 px-4 pb-28">
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to Account
        </Link>

        {step === "info" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">Delete My Account</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">We're sorry to see you go. Please review what happens below.</p>
            </div>

            {/* Guardrail */}
            {!guardrailLoading && guardrail?.hasActiveBookings && (
              <div className="bg-warning/5 border border-warning/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">You have {guardrail.count} active booking{guardrail.count > 1 ? "s" : ""}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Complete or cancel current bookings first to avoid disruption.</p>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs mt-3 h-9" asChild><Link to="/track">View Bookings</Link></Button>
                </div>
              </div>
            )}

            {/* What gets deleted — compact */}
            <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-semibold text-foreground mb-3">Your data</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {DATA_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.deleted ? "bg-destructive/10" : "bg-warning/10"}`}>
                      {item.deleted ? <Trash2 className="w-2.5 h-2.5 text-destructive" /> : <ShieldCheck className="w-2.5 h-2.5 text-warning" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-tight">{item.label}</p>
                      {!item.deleted && <p className="text-[9px] text-warning leading-tight">{item.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consequences — compact */}
            <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" /> What you should know
              </h2>
              <div className="space-y-2.5">
                {CONSEQUENCES.map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <c.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Timeline
              </h2>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <div className="flex-1 text-center p-3 bg-muted/50 rounded-xl">
                  <p className="font-bold text-foreground text-base">3</p>
                  <p>days to review</p>
                </div>
                <div className="flex-1 text-center p-3 bg-muted/50 rounded-xl">
                  <p className="font-bold text-foreground text-base">7</p>
                  <p>days to delete</p>
                </div>
                <div className="flex-1 text-center p-3 bg-muted/50 rounded-xl">
                  <p className="font-bold text-foreground text-base">90</p>
                  <p>days for records</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">Confirmation sent to <strong className="text-foreground">{user.email}</strong>. Cancel anytime before processing by contacting support.</p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Why are you leaving? <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                className="w-full rounded-xl border border-border/60 bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={2}
                placeholder="Help us improve…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
            </div>

            <Button variant="destructive" className="w-full h-12 rounded-xl font-semibold" onClick={handleProceedToReauth}>
              Continue
            </Button>
          </motion.div>
        )}

        {step === "reauth" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">Verify Your Identity</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">For your security, please re-enter your password.</p>
            </div>
            <div className="bg-card rounded-2xl border border-border/60 p-4">
              <p className="text-[11px] text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Password</p>
              </div>
              <input
                type="password"
                className="w-full rounded-xl border border-border/60 bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your password"
                value={reauthPassword}
                onChange={(e) => { setReauthPassword(e.target.value); setReauthError(""); }}
                autoComplete="current-password"
              />
              {reauthError && <p className="text-xs text-destructive">{reauthError}</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => { setStep("info"); setReauthPassword(""); setReauthError(""); }}>Back</Button>
              <Button variant="destructive" className="flex-1 h-12 rounded-xl font-semibold" disabled={!reauthPassword || reauthLoading} onClick={handleReauth}>
                {reauthLoading ? "Verifying…" : "Verify"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">Final Confirmation</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">Type <strong className="text-foreground">DELETE</strong> to permanently remove your account.</p>
            </div>
            <div className="bg-card rounded-2xl border border-border/60 p-4">
              <p className="text-[11px] text-muted-foreground">Deleting account for</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive leading-relaxed">This permanently deletes all your personal data, device records, booking history, and care plan benefits.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Type DELETE to confirm</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-border/60 bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive font-mono tracking-wider"
                  placeholder="DELETE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => { setStep("info"); setConfirmText(""); }}>Cancel</Button>
              <Button variant="destructive" className="flex-1 h-12 rounded-xl font-semibold" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                {submitting ? "Submitting…" : "Delete Account"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "submitted" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Request Submitted</h1>
            {ticketRef && (
              <div className="bg-card rounded-2xl border border-border/60 py-4 px-6 inline-block shadow-[var(--shadow-card)]">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reference</p>
                <p className="text-lg font-mono font-bold text-foreground mt-1">{ticketRef}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              We'll process your request within <strong className="text-foreground">7 business days</strong> and confirm at <strong className="text-foreground">{user.email}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">Changed your mind? <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">Contact support</a></p>
            <Button asChild className="rounded-xl mt-2"><Link to="/">Return Home</Link></Button>
          </motion.div>
        )}

        {step === "failed" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Submission Failed</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{failureMessage || "We couldn't process your request. Please try again or contact support."}</p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button variant="destructive" className="rounded-xl h-11" onClick={() => { setStep("confirm"); setConfirmText(""); }}>Try Again</Button>
              <Button variant="outline" className="rounded-xl h-11" asChild>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20LankaFix%20account.%20Email%3A%20${encodeURIComponent(user.email || "")}`}>
                  <Mail className="w-4 h-4 mr-2" /> Email Support
                </a>
              </Button>
              <Button variant="outline" className="rounded-xl h-11" asChild>
                <a href={whatsappLink(SUPPORT_WHATSAPP, "Hi, I need help deleting my LankaFix account.")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </PageTransition>
  );
};

export default AccountDeletionPage;
