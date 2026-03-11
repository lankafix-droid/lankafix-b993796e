import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrentPartner } from "@/hooks/useCurrentPartner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, ShieldCheck, MapPin, Phone, Wrench, Star,
  CheckCircle2, XCircle, Loader2, UserPlus, Clock, Landmark, FileCheck,
  Mail, CreditCard, Calendar,
} from "lucide-react";

function ProfileCompletenessCard({ partner, bankData, scheduleData, docsCount }: {
  partner: any;
  bankData: any;
  scheduleData: any;
  docsCount: number;
}) {
  const checks = [
    { label: "Full name", done: !!partner.full_name },
    { label: "Business name", done: !!partner.business_name, optional: partner.provider_type === "individual" },
    { label: "Phone number", done: !!partner.phone_number },
    { label: "Email added", done: !!partner.email },
    { label: "Profile photo", done: !!partner.profile_photo_url },
    { label: "Categories selected", done: partner.categories_supported?.length > 0 },
    { label: "Zones selected", done: partner.service_zones?.length > 0 },
    { label: "Documents uploaded", done: docsCount > 0 },
    { label: "Bank details", done: !!bankData },
    { label: "Verification", done: partner.verification_status === "verified" },
  ].filter(c => !c.optional || c.done); // Only show optional items if done

  const completed = checks.filter((c) => c.done).length;
  const percent = Math.round((completed / checks.length) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" /> Profile Strength
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{completed}/{checks.length} complete</span>
          <span className="font-bold text-foreground">{percent}%</span>
        </div>
        <Progress value={percent} className="h-2" />
        <div className="space-y-1.5">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              {c.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnerProfilePage() {
  const navigate = useNavigate();
  const { data: partner, isLoading } = useCurrentPartner();

  // Fetch related data
  const { data: bankData } = useQuery({
    queryKey: ["partner_bank", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return null;
      const { data } = await supabase
        .from("partner_bank_accounts")
        .select("bank_name, branch, verification_status")
        .eq("partner_id", partner.id)
        .maybeSingle();
      return data;
    },
    enabled: !!partner?.id,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ["partner_schedule", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return null;
      const { data } = await supabase
        .from("partner_schedules")
        .select("working_days, start_time, end_time, emergency_available")
        .eq("partner_id", partner.id)
        .maybeSingle();
      return data;
    },
    enabled: !!partner?.id,
  });

  const { data: docsData } = useQuery({
    queryKey: ["partner_docs", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data } = await supabase
        .from("partner_documents")
        .select("document_type, verification_status, created_at")
        .eq("partner_id", partner.id);
      return data || [];
    },
    enabled: !!partner?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold text-foreground">No Partner Profile</h2>
            <p className="text-sm text-muted-foreground">Complete onboarding to create your profile.</p>
            <Button onClick={() => navigate("/join")}>Join as Provider</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Partner Profile</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Identity Card */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {partner.profile_photo_url ? (
                  <img src={partner.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <p className="font-bold text-foreground">{partner.full_name}</p>
                {partner.business_name && (
                  <p className="text-xs text-muted-foreground">{partner.business_name}</p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  {partner.verification_status === "verified" ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-success" />
                      <span className="text-xs text-success">Verified</span>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">{partner.verification_status}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-foreground">
                  {partner.rating_average ? `⭐ ${Number(partner.rating_average).toFixed(1)}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-foreground">{partner.completed_jobs_count || 0}</p>
                <p className="text-xs text-muted-foreground">Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Completeness */}
        <ProfileCompletenessCard
          partner={partner}
          bankData={bankData}
          scheduleData={scheduleData}
          docsCount={docsData?.length || 0}
        />

        {/* Contact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">{partner.phone_number}</p>
            {partner.email && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> {partner.email}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Zones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Service Zones</CardTitle>
          </CardHeader>
          <CardContent>
            {partner.service_zones?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {partner.service_zones.map((z: string) => (
                  <Badge key={z} variant="secondary" className="text-xs">{z}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No zones configured yet</p>
            )}
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {partner.categories_supported?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {partner.categories_supported.map((c: string) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No categories configured</p>
            )}
          </CardContent>
        </Card>

        {/* Specializations */}
        {partner.specializations?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Specializations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {partner.specializations.map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Schedule</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {scheduleData ? (
              <div className="space-y-1">
                <p>{(scheduleData.working_days as string[])?.join(", ") || "Not set"}</p>
                <p>{scheduleData.start_time} – {scheduleData.end_time}</p>
                {scheduleData.emergency_available && (
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Emergency Available</Badge>
                )}
              </div>
            ) : (
              <p>Schedule not configured yet</p>
            )}
          </CardContent>
        </Card>

        {/* Bank */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" /> Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {bankData ? (
              <div className="space-y-1">
                <p>{bankData.bank_name} — {bankData.branch || "Branch not set"}</p>
                <Badge variant="outline" className="text-[10px]">{bankData.verification_status}</Badge>
              </div>
            ) : (
              <p>Bank details not provided yet</p>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><FileCheck className="w-4 h-4 text-primary" /> Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {docsData && docsData.length > 0 ? (
              <div className="space-y-1">
                {docsData.map((d: any) => (
                  <div key={d.document_type} className="flex items-center justify-between text-sm">
                    <span className="text-foreground capitalize">{d.document_type.replace(/_/g, " ")}</span>
                    <Badge variant="outline" className="text-[10px]">{d.verification_status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
