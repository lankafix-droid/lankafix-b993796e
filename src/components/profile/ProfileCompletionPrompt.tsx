/**
 * ProfileCompletionPrompt — Smart, non-blocking prompt for the next missing field.
 * Now service-aware with booking readiness context.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { X, User, Phone, Mail, MapPin, ChevronRight, CheckCircle2, Shield } from "lucide-react";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfileCompletionPrompt() {
  const { profile, missingFields, completionPct, updateProfile, hasServiceableAddress } = useCustomerProfile();
  const [dismissed, setDismissed] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Only prompt for critical missing fields (name, phone) — skip email/district until needed
  const criticalMissing = missingFields.filter(f => f === "full_name" || f === "phone");
  if (!profile || criticalMissing.length === 0 || dismissed) return null;

  const nextField = criticalMissing[0];

  if (!nextField) return null;

  const fieldConfig: Record<string, { label: string; placeholder: string; icon: React.ReactNode; type: string }> = {
    full_name: { label: "What's your name?", placeholder: "Your full name", icon: <User className="w-4 h-4" />, type: "text" },
    phone: { label: "Your phone number", placeholder: "07X XXX XXXX", icon: <Phone className="w-4 h-4" />, type: "tel" },
    email: { label: "Your email address", placeholder: "you@example.com", icon: <Mail className="w-4 h-4" />, type: "email" },
    district: { label: "Your district", placeholder: "e.g. Colombo, Kandy", icon: <MapPin className="w-4 h-4" />, type: "text" },
  };

  const config = fieldConfig[nextField];
  if (!config) return null;

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    await updateProfile.mutateAsync({ [nextField]: value.trim() } as any);
    setValue("");
    setSaving(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mx-4 mb-4 p-4 rounded-2xl bg-card border border-border shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {config.icon}
            </div>
            <span className="text-sm font-medium text-foreground">{config.label}</span>
          </div>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <Input
            type={config.type}
            placeholder={config.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 rounded-xl flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button
            size="sm"
            className="h-10 rounded-xl px-4"
            onClick={handleSave}
            disabled={saving || !value.trim()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Progress value={completionPct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground">{completionPct}%</span>
        </div>

        {/* Booking readiness hint */}
        {hasServiceableAddress ? (
          <p className="text-xs text-primary flex items-center gap-1 mt-1.5">
            <CheckCircle2 className="w-3 h-3" /> Address verified for Phase-1
          </p>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
            <Shield className="w-3 h-3" /> Complete your profile for faster bookings
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
