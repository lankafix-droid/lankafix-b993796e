/**
 * LankaFix Admin Partner Provisioning
 * Allows admins to search auth users, create/link partner records,
 * verify partners, and set dispatch eligibility for the Colombo pilot.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Search, UserPlus, Shield, CheckCircle2, AlertTriangle,
  Loader2, Users, MapPin, Wrench, Phone, Building2,
} from "lucide-react";

const COLOMBO_ZONES = [
  "col_01", "col_02", "col_03", "col_04", "col_05", "col_06", "col_07",
  "col_08", "col_09", "col_10", "col_11", "col_12", "col_13", "col_14", "col_15",
  "nugegoda", "rajagiriya", "battaramulla", "nawala", "dehiwala", "mt_lavinia",
  "thalawathugoda", "maharagama", "kotte", "kaduwela", "malabe", "piliyandala",
  "moratuwa", "wattala", "negombo",
];

const PILOT_CATEGORIES = [
  { code: "MOBILE", label: "Mobile Phone Repairs" },
  { code: "IT", label: "IT Support" },
  { code: "AC", label: "AC Services" },
  { code: "ELECTRICAL", label: "Electrical" },
  { code: "CCTV", label: "CCTV Solutions" },
  { code: "CONSUMER_ELEC", label: "Consumer Electronics" },
  { code: "SOLAR", label: "Solar" },
  { code: "PLUMBING", label: "Plumbing" },
  { code: "NETWORK", label: "Internet & Network" },
];

interface FoundProfile {
  user_id: string;
  full_name: string;
}

interface FoundPartner {
  id: string;
  user_id: string;
  full_name: string;
  business_name: string | null;
  phone_number: string;
  verification_status: string;
  availability_status: string;
  categories_supported: string[];
  service_zones: string[];
  is_seeded: boolean;
}

export default function PartnerProvisioningPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [foundProfile, setFoundProfile] = useState<FoundProfile | null>(null);
  const [foundPartner, setFoundPartner] = useState<FoundPartner | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);

  // Create form state
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["MOBILE"]);
  const [selectedZones, setSelectedZones] = useState<string[]>(["col_01"]);
  const [verificationStatus, setVerificationStatus] = useState<string>("verified");

  // Existing partners list
  const { data: existingPartners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, user_id, full_name, business_name, phone_number, verification_status, availability_status, categories_supported, service_zones, is_seeded")
        .eq("is_seeded", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as FoundPartner[];
    },
  });

  // Search user by profile name or user_id
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    setFoundProfile(null);
    setFoundPartner(null);

    try {
      // Try searching profiles by full_name (ilike) or exact user_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

      let profileData: any = null;
      if (isUUID) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("user_id", q)
          .maybeSingle();
        profileData = data;
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .ilike("full_name", `%${q}%`)
          .limit(1)
          .maybeSingle();
        profileData = data;
      }

      if (!profileData) {
        setSearchError("No user found. The user must sign up first.");
        setSearching(false);
        return;
      }

      setFoundProfile(profileData);
      setFullName(profileData.full_name || "");

      // Check if partner already exists for this user
      const { data: existingPartner } = await supabase
        .from("partners")
        .select("id, user_id, full_name, business_name, phone_number, verification_status, availability_status, categories_supported, service_zones, is_seeded")
        .eq("user_id", profileData.user_id)
        .maybeSingle();

      if (existingPartner) {
        setFoundPartner(existingPartner as FoundPartner);
      }
    } catch (e: any) {
      setSearchError(e.message || "Search failed");
    }
    setSearching(false);
  };

  // Create new partner
  const createPartner = useMutation({
    mutationFn: async () => {
      if (!foundProfile) throw new Error("No user selected");
      if (!fullName.trim()) throw new Error("Full name is required");
      if (!phoneNumber.trim()) throw new Error("Phone number is required");
      if (selectedCategories.length === 0) throw new Error("At least one category required");
      if (selectedZones.length === 0) throw new Error("At least one zone required");

      const { data, error } = await supabase
        .from("partners")
        .insert({
          user_id: foundProfile.user_id,
          full_name: fullName.trim(),
          business_name: businessName.trim() || null,
          phone_number: phoneNumber.trim(),
          categories_supported: selectedCategories,
          service_zones: selectedZones,
          verification_status: verificationStatus as any,
          availability_status: "available" as any,
          is_seeded: false,
          skill_level: 2,
          reliability_tier: "verified",
        })
        .select("id")
        .single();

      if (error) {
        if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
          throw new Error("A partner record already exists for this user");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success("✅ Partner created and verified for pilot dispatch");
      // Re-search to show updated state
      handleSearch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Verify existing partner (set verified + available)
  const verifyPartner = useMutation({
    mutationFn: async (partnerId: string) => {
      const { error } = await supabase
        .from("partners")
        .update({
          verification_status: "verified" as any,
          availability_status: "available" as any,
        })
        .eq("id", partnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success("Partner verified and set available");
      handleSearch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCategory = (code: string) => {
    setSelectedCategories(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleZone = (zone: string) => {
    setSelectedZones(prev =>
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  };

  const isDispatchEligible = (p: FoundPartner) =>
    p.verification_status === "verified" &&
    !p.is_seeded &&
    p.availability_status !== "offline" &&
    p.categories_supported?.includes("MOBILE") &&
    (p.service_zones?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-background safe-area-top">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/admin-setup")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-heading">Partner Provisioning</h1>
            <p className="text-sm text-muted-foreground">Create & verify partners for Colombo pilot</p>
          </div>
        </div>

        {/* Step 1: Search User */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Step 1: Find Auth User
            </CardTitle>
            <CardDescription>Search by name or paste user ID. User must have signed up first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Name or User ID (UUID)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
            </div>

            {searchError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" />
                {searchError}
              </div>
            )}

            {foundProfile && (
              <div className="p-3 rounded-lg border bg-success/5 border-success/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">User Found</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{foundProfile.user_id}</p>
                <p className="text-sm mt-0.5">{foundProfile.full_name || "(no name)"}</p>
              </div>
            )}

            {foundPartner && (
              <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Partner Record Exists</span>
                  <Badge variant="outline" className={
                    foundPartner.verification_status === "verified"
                      ? "bg-success/10 text-success border-success/20 text-[10px]"
                      : "bg-warning/10 text-warning border-warning/20 text-[10px]"
                  }>
                    {foundPartner.verification_status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {foundPartner.availability_status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Categories: {foundPartner.categories_supported?.join(", ") || "none"}<br />
                  Zones: {foundPartner.service_zones?.join(", ") || "none"}
                </p>

                {!isDispatchEligible(foundPartner) ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-warning">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Not dispatch-eligible yet
                      {foundPartner.verification_status !== "verified" && " — needs verification"}
                    </div>
                    {foundPartner.verification_status !== "verified" && (
                      <Button
                        size="sm"
                        onClick={() => verifyPartner.mutate(foundPartner.id)}
                        disabled={verifyPartner.isPending}
                      >
                        {verifyPartner.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Shield className="w-3.5 h-3.5 mr-1.5" />}
                        Verify & Activate for Pilot
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dispatch-eligible for Mobile Repair pilot
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Create Partner (only if user found but no partner record) */}
        {foundProfile && !foundPartner && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Step 2: Create Partner Record
              </CardTitle>
              <CardDescription>Fill required fields to make this user a dispatch-eligible partner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Kasun Perera" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Business Name</label>
                  <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number *
                </label>
                <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="077XXXXXXX" />
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Service Categories *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PILOT_CATEGORIES.map(cat => (
                    <Badge
                      key={cat.code}
                      variant="outline"
                      className={`cursor-pointer text-[11px] transition-colors ${
                        selectedCategories.includes(cat.code)
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "hover:border-primary/20"
                      }`}
                      onClick={() => toggleCategory(cat.code)}
                    >
                      {selectedCategories.includes(cat.code) && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Zones */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Service Zones * (Colombo Pilot)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {COLOMBO_ZONES.map(zone => (
                    <Badge
                      key={zone}
                      variant="outline"
                      className={`cursor-pointer text-[10px] transition-colors ${
                        selectedZones.includes(zone)
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "hover:border-primary/20"
                      }`}
                      onClick={() => toggleZone(zone)}
                    >
                      {selectedZones.includes(zone) && <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />}
                      {zone}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => setSelectedZones(COLOMBO_ZONES)}>
                  Select All Colombo Zones
                </Button>
              </div>

              {/* Verification */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Verification Status</label>
                <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">✅ Verified (dispatch-eligible)</SelectItem>
                    <SelectItem value="pending">⏳ Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Eligibility Preview */}
              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <p className="text-xs font-medium">Dispatch Eligibility Preview</p>
                <div className="text-xs space-y-0.5">
                  <EligRow ok={verificationStatus === "verified"} label="Verification = verified" />
                  <EligRow ok={selectedCategories.includes("MOBILE")} label="MOBILE category selected" />
                  <EligRow ok={selectedZones.length > 0} label="At least 1 Colombo zone" />
                  <EligRow ok={!!phoneNumber.trim()} label="Phone number provided" />
                  <EligRow ok={!!fullName.trim()} label="Full name provided" />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => createPartner.mutate()}
                disabled={createPartner.isPending || !fullName.trim() || !phoneNumber.trim() || selectedCategories.length === 0 || selectedZones.length === 0}
              >
                {createPartner.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Create Partner & Activate for Pilot
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Existing Real Partners */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Real Partners (non-seeded)
              <Badge variant="secondary" className="ml-auto">{existingPartners.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPartners ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : existingPartners.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No real partners yet</p>
                <p className="text-xs">Use the form above to provision the first pilot partner</p>
              </div>
            ) : (
              <div className="space-y-2">
                {existingPartners.map(p => (
                  <div key={p.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.full_name}</span>
                        <Badge variant="outline" className={`text-[10px] ${
                          p.verification_status === "verified"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-warning/10 text-warning border-warning/20"
                        }`}>
                          {p.verification_status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{p.availability_status}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {p.categories_supported?.join(", ")} · {p.service_zones?.length || 0} zones
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isDispatchEligible(p) ? (
                        <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" />
                          Eligible
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => verifyPartner.mutate(p.id)}
                          disabled={verifyPartner.isPending}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EligRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-success" : "bg-destructive"}`} />
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
