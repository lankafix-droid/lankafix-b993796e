/**
 * CoverageWaitlist — Premium "Coming Soon" state with waitlist capture.
 * Enhanced with analytics fields for expansion planning.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Bell, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  onClose: () => void;
  sourceScreen?: string;
}

export default function CoverageWaitlist({ city, district, latitude, longitude, category, onClose, sourceScreen }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("coverage_waitlist").insert({
        user_id: user?.id || null,
        name: name.trim() || null,
        phone: phone.trim(),
        city: city || null,
        district: district || null,
        latitude: latitude || null,
        longitude: longitude || null,
        requested_category: category || null,
        reason_code: "outside_coverage",
        serviceability_status: "outside",
        source_screen: sourceScreen || "unknown",
        created_from_booking_gate: sourceScreen === "booking_gate",
      } as any);
      if (error) throw error;
      setSubmitted(true);
      toast.success("You're on the waitlist!");
    } catch {
      toast.error("Failed to join waitlist");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-8 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">You're on the list!</p>
        <p className="text-sm text-muted-foreground">We'll notify you when LankaFix launches in your area.</p>
        <Button variant="outline" onClick={onClose} className="rounded-xl mt-2">Close</Button>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-4">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
          <MapPin className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground">Coming Soon to Your Area</p>
        <p className="text-sm text-muted-foreground">
          LankaFix Phase-1 covers Greater Colombo. We're expanding soon!
        </p>
        {city && <p className="text-xs text-muted-foreground/70">Detected: {city}{district ? `, ${district}` : ""}</p>}
      </div>

      <div className="space-y-3 pt-2">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Name (optional)</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="rounded-xl h-11 mt-1" />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Phone number</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07X XXX XXXX" type="tel" className="rounded-xl h-11 mt-1" />
        </div>
        <Button onClick={handleSubmit} disabled={saving || !phone.trim()} className="w-full rounded-xl h-12 font-semibold text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
          Notify Me When Available
        </Button>
      </div>
    </div>
  );
}
