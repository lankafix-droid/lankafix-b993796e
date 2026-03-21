/**
 * BookingTrustStrip — Contextual micro-trust message shown during booking flow.
 * Changes message based on current step to reinforce confidence at each stage.
 */
import { ShieldCheck, Eye, Lock, Award, Clock } from "lucide-react";

const STEP_TRUST: Record<string, { icon: React.ReactNode; message: string }> = {
  service_type: { icon: <Eye className="w-3 h-3" />, message: "Transparent pricing — no hidden fees" },
  issue: { icon: <ShieldCheck className="w-3 h-3" />, message: "No work starts without your approval" },
  pricing_expectation: { icon: <Eye className="w-3 h-3" />, message: "Final quote confirmed before any repair" },
  part_grade: { icon: <Award className="w-3 h-3" />, message: "All parts carry a warranty" },
  service_mode: { icon: <Clock className="w-3 h-3" />, message: "Same-day service available" },
  location: { icon: <Lock className="w-3 h-3" />, message: "Your address is kept private" },
  device_identification: { icon: <ShieldCheck className="w-3 h-3" />, message: "Data-safe repair process" },
  device_details: { icon: <ShieldCheck className="w-3 h-3" />, message: "Your device info helps accurate diagnosis" },
  smart_diagnosis: { icon: <Eye className="w-3 h-3" />, message: "AI-assisted — final diagnosis by technician" },
  diagnosis_summary: { icon: <Award className="w-3 h-3" />, message: "Verified technicians matched to your issue" },
  site_conditions: { icon: <ShieldCheck className="w-3 h-3" />, message: "Helps your technician prepare properly" },
  pricing: { icon: <Eye className="w-3 h-3" />, message: "Pay only after successful completion" },
  booking_protection: { icon: <Lock className="w-3 h-3" />, message: "Refundable if no technician is assigned" },
  assignment: { icon: <ShieldCheck className="w-3 h-3" />, message: "Background-checked & skill-verified" },
  confirmation: { icon: <Award className="w-3 h-3" />, message: "Protected by LankaFix Guarantee" },
};

const DEFAULT_TRUST = { icon: <ShieldCheck className="w-3 h-3" />, message: "Protected by LankaFix Guarantee" };

interface Props {
  currentStep: string;
}

const BookingTrustStrip = ({ currentStep }: Props) => {
  const trust = STEP_TRUST[currentStep] || DEFAULT_TRUST;

  return (
    <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-primary/70 py-1">
      {trust.icon}
      <span>{trust.message}</span>
    </div>
  );
};

export default BookingTrustStrip;
