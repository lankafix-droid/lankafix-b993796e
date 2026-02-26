import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import MascotIcon from "@/components/brand/MascotIcon";

interface OtpVerifyModalProps {
  open: boolean;
  onClose: () => void;
  onVerify: (otp: string) => void;
  type: "start" | "completion";
  jobId: string;
}

const OtpVerifyModal = ({ open, onClose, onVerify, type, jobId }: OtpVerifyModalProps) => {
  const [otp, setOtp] = useState("");

  if (!open) return null;

  const title = type === "start" ? "Start Job Verification" : "Job Completion Verification";
  const description = type === "start"
    ? "Share this OTP with the technician to begin work."
    : "Enter the OTP provided by the technician to confirm job completion.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border shadow-2xl p-6 w-full max-w-sm mx-4 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <MascotIcon state={type === "start" ? "in_progress" : "completed"} badge="verified" size="lg" />
          <h2 className="text-lg font-bold text-foreground mt-4">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-1">{description}</p>
          <p className="text-xs text-muted-foreground mb-4">Job: {jobId}</p>

          <div className="mb-6">
            <InputOTP maxLength={4} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              variant="hero"
              className="flex-1"
              disabled={otp.length < 4}
              onClick={() => onVerify(otp)}
            >
              Verify
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerifyModal;
