/**
 * TrackerOTPDisplay — Shows OTP codes for start/completion verification.
 * Reuses existing OTP infrastructure from booking table fields.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useState } from "react";

interface TrackerOTPDisplayProps {
  bookingId: string;
  bookingStatus: string;
}

export default function TrackerOTPDisplay({ bookingId, bookingStatus }: TrackerOTPDisplayProps) {
  const [copied, setCopied] = useState<"start" | "completion" | null>(null);

  const { data: otpData } = useQuery({
    queryKey: ["booking-otp", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_otp, start_otp_expires_at, completion_otp, completion_otp_expires_at, started_at, completed_at")
        .eq("id", bookingId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!bookingId,
    refetchInterval: 15_000,
  });

  // Only show OTP section when technician has arrived or is about to start work
  const showStartOTP = ["arrived", "inspection_started"].includes(bookingStatus) && otpData?.start_otp && !otpData?.started_at;
  const showCompletionOTP = ["repair_started", "in_progress"].includes(bookingStatus) && otpData?.completion_otp && !otpData?.completed_at;
  const startVerified = !!otpData?.started_at;
  const completionVerified = !!otpData?.completed_at;

  if (!showStartOTP && !showCompletionOTP && !startVerified && !completionVerified) return null;
  if (!["arrived", "inspection_started", "repair_started", "in_progress", "quote_submitted", "quote_approved"].includes(bookingStatus)) return null;

  const handleCopy = (code: string, type: "start" | "completion") => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(type);
      toast.success("OTP copied!");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <motion.div
      className="bg-card rounded-2xl border border-border/60 p-4 shadow-[var(--shadow-card)] space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
    >
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Verification Codes</span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Share these codes with your technician to verify service start and completion.
      </p>

      {/* Start OTP */}
      {showStartOTP && otpData?.start_otp && (
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Start Code</p>
            <p className="text-2xl font-mono font-bold text-primary tracking-[0.3em] mt-0.5">{otpData.start_otp}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-8 text-xs"
            onClick={() => handleCopy(otpData.start_otp!, "start")}
          >
            {copied === "start" ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}

      {startVerified && (
        <div className="flex items-center gap-2 p-2.5 bg-success/5 rounded-xl border border-success/10">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-xs font-medium text-success">Start verified</span>
        </div>
      )}

      {/* Completion OTP */}
      {showCompletionOTP && otpData?.completion_otp && (
        <div className="flex items-center justify-between p-3 bg-accent/5 rounded-xl border border-accent/10">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Completion Code</p>
            <p className="text-2xl font-mono font-bold text-accent tracking-[0.3em] mt-0.5">{otpData.completion_otp}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg h-8 text-xs"
            onClick={() => handleCopy(otpData.completion_otp!, "completion")}
          >
            {copied === "completion" ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}

      {completionVerified && (
        <div className="flex items-center gap-2 p-2.5 bg-success/5 rounded-xl border border-success/10">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-xs font-medium text-success">Completion verified</span>
        </div>
      )}
    </motion.div>
  );
}
