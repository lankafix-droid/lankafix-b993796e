/**
 * CoverageWaitlist — Elegant "Coming Soon" state for out-of-coverage users.
 * Captures waitlist signup.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Bell, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  onClose?: () => void;
}

export default function CoverageWaitlist({ city, district, latitude, longitude, category, onClose }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim()) { toast.error("Phone number is required"); return; }
    setLoading(true);
    const { error } = await supabase.from("coverage_waitlist").insert({
      user_id: user?.id || null,
      name: name || null,
      phone: phone.trim(),
      email: user?.email || null,
      latitude: latitude || null,
      longitude: longitude || null,
      city: city || null,
      district: district || null,
      requested_category: category || null,
    } as any);
    setLoading(false);
    if (error) { toast.error("Could not join waitlist"); return; }
    setSubmitted(true);
    toast.success("You're on the waitlist!");
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-6 space-y-3"
      >
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">You're on the list!</h3>
        <p className="text-sm text-muted-foreground">
          We'll notify you as soon as LankaFix launches in {city || district || "your area"}.
        </p>
        {onClose && (
          <Button variant="ghost" onClick={onClose} className="mt-2">Close</Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 space-y-4"
    >
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <MapPin className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Coming Soon to Your Area</h3>
        <p className="text-sm text-muted-foreground">
          LankaFix is currently available in Greater Colombo.
          {city && ` We haven't reached ${city} yet, but we're expanding fast.`}
        </p>
      </div>

      <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-primary" />
          Get notified when we launch near you
        </p>
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="rounded-xl h-10"
          />
        </div>
        <div>
          <Label className="text-xs">Phone *</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07X XXX XXXX"
            type="tel"
            className="rounded-xl h-10"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl h-10 font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Notify Me
        </Button>
      </div>
    </motion.div>
  );
}
