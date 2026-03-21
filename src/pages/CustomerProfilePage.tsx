/**
 * CustomerProfilePage — editable customer profile with saved addresses
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, User, Mail, Phone, MapPin, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { useAuth } from "@/hooks/useAuth";
import SavedAddressManager from "@/components/profile/SavedAddressManager";
import PageTransition from "@/components/motion/PageTransition";

const SRI_LANKA_DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Mullaitivu", "Vavuniya", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
];

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, completionPct } = useCustomerProfile();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    district: "",
    preferred_contact_method: "phone",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        whatsapp_number: profile.whatsapp_number || "",
        district: profile.district || "",
        preferred_contact_method: profile.preferred_contact_method || "phone",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile.mutateAsync(form as any);
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">My Profile</h1>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Avatar + Completion */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {form.full_name?.charAt(0)?.toUpperCase() || <User className="w-6 h-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{form.full_name || "Complete your profile"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={completionPct} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">{completionPct}%</span>
            </div>
            {completionPct >= 80 && (
              <p className="text-xs text-primary flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> Profile complete
              </p>
            )}
          </div>
        </div>

        {/* Auth providers info */}
        {profile?.auth_providers && profile.auth_providers.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            Linked via: {profile.auth_providers.join(", ")}
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Full Name</Label>
            <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} className="rounded-xl mt-1" placeholder="Your full name" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
            <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="rounded-xl mt-1" placeholder="Email address" type="email" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="rounded-xl mt-1" placeholder="07X XXX XXXX" type="tel" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp (optional)</Label>
            <Input value={form.whatsapp_number} onChange={(e) => setForm((p) => ({ ...p, whatsapp_number: e.target.value }))} className="rounded-xl mt-1" placeholder="WhatsApp number" type="tel" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> District</Label>
            <Select value={form.district} onValueChange={(v) => setForm((p) => ({ ...p, district: v }))}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select district" /></SelectTrigger>
              <SelectContent>
                {SRI_LANKA_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Preferred Contact Method</Label>
            <Select value={form.preferred_contact_method} onValueChange={(v) => setForm((p) => ({ ...p, preferred_contact_method: v }))}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl h-11 font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>

        {/* Saved Addresses */}
        <div className="pt-4 border-t border-border">
          <SavedAddressManager />
        </div>
      </div>
    </PageTransition>
  );
}
