/**
 * Partner Response Portal — LankaFix
 *
 * Lightweight, mobile-first page for partners to accept/reject assignments.
 * Accessed via secure token link: /partner/respond/:token
 *
 * No authentication required — token-based security.
 * Future: WhatsApp deep links point here.
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle, XCircle, Ban, Clock, MapPin, Wrench,
  User, Loader2, ShieldCheck, AlertTriangle
} from "lucide-react";

interface LeadInfo {
  id: string;
  category_code: string;
  customer_name: string | null;
  customer_location: string | null;
  description: string | null;
  zone_code: string | null;
  accept_by: string | null;
  partner_response_status: string;
  assignment_attempt: number;
}

const REJECTION_REASONS = [
  { value: "too_far", label: "Too far away" },
  { value: "too_busy", label: "Currently busy" },
  { value: "wrong_category", label: "Wrong category for me" },
  { value: "customer_unreachable", label: "Customer unreachable" },
  { value: "pricing_mismatch", label: "Pricing won't work" },
  { value: "unavailable_now", label: "Not available right now" },
  { value: "other", label: "Other reason" },
];

type ResponseState = "loading" | "ready" | "submitting" | "success" | "error" | "expired" | "already_responded";

export default function PartnerRespondPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ResponseState>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [resultMessage, setResultMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("too_busy");
  const [notes, setNotes] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Fetch lead info via token
  useEffect(() => {
    if (!token) { setState("error"); return; }

    const fetchLead = async () => {
      const { data, error } = await supabase
        .from("leads" as any)
        .select("id, category_code, customer_name, customer_location, description, zone_code, accept_by, partner_response_status, assignment_attempt")
        .eq("response_token", token)
        .single();

      if (error || !data) {
        setState("error");
        setResultMessage("Invalid or expired response link.");
        return;
      }

      const l = data as any as LeadInfo;

      if (l.partner_response_status !== "pending") {
        setState("already_responded");
        setResultMessage(`This assignment was already ${l.partner_response_status}.`);
        setLead(l);
        return;
      }

      if (l.accept_by && new Date(l.accept_by) < new Date()) {
        setState("expired");
        setResultMessage("This assignment has expired. It may have been reassigned to another partner.");
        setLead(l);
        return;
      }

      setLead(l);
      setState("ready");
    };

    fetchLead();
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (!lead?.accept_by || state !== "ready") return;

    const interval = setInterval(() => {
      const remaining = new Date(lead.accept_by!).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft("EXPIRED");
        setState("expired");
        setResultMessage("This assignment has expired.");
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [lead?.accept_by, state]);

  const handleAction = async (action: "accept" | "reject" | "unavailable") => {
    if (!token) return;
    setState("submitting");

    try {
      const { data, error } = await supabase.functions.invoke("partner-respond", {
        body: {
          token,
          action,
          rejection_reason: action === "reject" ? rejectReason : undefined,
          notes: notes || undefined,
        },
      });

      if (error) {
        setState("error");
        setResultMessage(error.message || "Something went wrong.");
        return;
      }

      if (data?.already_responded) {
        setState("already_responded");
        setResultMessage(data.message);
        return;
      }

      setState("success");
      setResultMessage(data?.message || "Response recorded successfully.");
    } catch (err: any) {
      setState("error");
      setResultMessage(err.message || "Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 safe-area-top">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-bold text-foreground font-heading">LankaFix Partner</h1>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Loading */}
        {state === "loading" && (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading assignment details...</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {state === "error" && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">Something went wrong</p>
              <p className="text-xs text-muted-foreground">{resultMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Expired */}
        {state === "expired" && (
          <Card className="border-warning/30">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-warning mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">Assignment Expired</p>
              <p className="text-xs text-muted-foreground">{resultMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Already responded */}
        {state === "already_responded" && (
          <Card className="border-primary/30">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">Already Responded</p>
              <p className="text-xs text-muted-foreground">{resultMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {state === "success" && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">Response Recorded</p>
              <p className="text-xs text-muted-foreground">{resultMessage}</p>
              <p className="text-[10px] text-muted-foreground mt-4">You can close this page now.</p>
            </CardContent>
          </Card>
        )}

        {/* Ready — show job details and actions */}
        {state === "ready" && lead && (
          <>
            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 bg-warning/10 rounded-lg p-3">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-warning">
                Respond within: {timeLeft}
              </span>
            </div>

            {/* Job details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">New Job Assignment</span>
                  {lead.assignment_attempt > 1 && (
                    <Badge variant="outline" className="text-[9px] text-warning">
                      Reassigned (attempt {lead.assignment_attempt})
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{lead.category_code}</Badge>
                  </div>

                  {lead.customer_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span>{lead.customer_name}</span>
                    </div>
                  )}

                  {lead.customer_location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{lead.customer_location}</span>
                    </div>
                  )}

                  {lead.description && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                      {lead.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Accept button — prominent */}
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={() => handleAction("accept")}
              disabled={state === "submitting"}
            >
              {state === "submitting" ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              Accept Assignment
            </Button>

            {/* Reject section */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Can't take this job?</p>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Additional notes (optional)"
                  className="text-xs min-h-[60px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-9 text-xs"
                    onClick={() => handleAction("reject")}
                    disabled={state === "submitting"}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 text-xs"
                    onClick={() => handleAction("unavailable")}
                    disabled={state === "submitting"}
                  >
                    <Ban className="w-3.5 h-3.5 mr-1" /> Unavailable
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-[10px] text-center text-muted-foreground">
              Powered by LankaFix • Sri Lanka's trusted service marketplace
            </p>
          </>
        )}
      </div>
    </div>
  );
}
