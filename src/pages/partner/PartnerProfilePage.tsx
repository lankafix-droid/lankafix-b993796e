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
  Mail, Calendar, AlertTriangle, Edit, Shield,
} from "lucide-react";

// ─── Verification status config ──────────────────────────────────
const VERIFICATION_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "Pending Review", className: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  verified: { label: "Verified", className: "bg-success/10 text-success border-success/30", icon: ShieldCheck },
  suspended: { label: "Suspended", className: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
};

const DOC_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Review", className: "bg-warning/10 text-warning border-warning/30" },
  verified: { label: "Verified", className: "bg-success/10 text-success border-success/30" },
  rejected: { label: "Action Needed", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

// ─── Profile Completeness ────────────────────────────────────────
function ProfileCompletenessCard({ partner, bankData, scheduleData, docsCount, conductAccepted }: {
  partner: any;
  bankData: any;
  scheduleData: any;
  docsCount: number;
  conductAccepted: boolean;
}) {
  const checks = [
    { label: "Account linked", done: !!partner.user_id },
    { label: "Full name", done: !!partner.full_name },
    { label: "Business name", done: !!partner.business_name, optional: partner.provider_type === "individual" },
    { label: "Phone number", done: !!partner.phone_number },
    { label: "Email added", done: !!partner.email },
    { label: "Profile photo", done: !!partner.profile_photo_url },
    { label: "Categories selected", done: partner.categories_supported?.length > 0 },
    { label: "Zones selected", done: partner.service_zones?.length > 0 },
    { label: "Availability set", done: !!scheduleData },
    { label: "Documents uploaded", done: docsCount > 0 },
    { label: "Bank details saved", done: !!bankData },
    { label: "Conduct accepted", done: conductAccepted },
    { label: "Verification", done: partner.verification_status === "verified" },
  ].filter(c => !c.optional || c.done);

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
        {percent < 100 && (
          <p className="text-[10px] text-muted-foreground pt-1">
            Complete your profile to improve visibility and get verified faster.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function PartnerProfilePage() {
  const navigate = useNavigate();
  const { data: partner, isLoading } = useCurrentPartner();

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
        .select("document_type, verification_status, rejection_reason, created_at")
        .eq("partner_id", partner.id);
      return data || [];
    },
    enabled: !!partner?.id,
  });

  const { data: conductAccepted = false } = useQuery({
    queryKey: ["partner_conduct", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return false;
      const { data } = await supabase
        .from("policy_acceptances")
        .select("id")
        .eq("partner_id", partner.id)
        .eq("policy_type", "code_of_conduct")
        .maybeSingle();
      return !!data;
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

  const verConfig = VERIFICATION_CONFIG[partner.verification_status] || VERIFICATION_CONFIG.pending;
  const VerIcon = verConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Partner Profile</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/join")}>
          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
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
                  <VerIcon className={`w-3 h-3 ${verConfig.className.includes("text-success") ? "text-success" : verConfig.className.includes("text-warning") ? "text-warning" : "text-destructive"}`} />
                  <Badge variant="outline" className={`text-[10px] ${verConfig.className}`}>{verConfig.label}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-foreground">
                  {partner.rating_average && Number(partner.rating_average) > 0 ? `⭐ ${Number(partner.rating_average).toFixed(1)}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-foreground">{partner.completed_jobs_count || 0}</p>
                <p className="text-xs text-muted-foreground">Jobs</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-t pt-2 space-y-1">
              <p className="text-[10px] text-muted-foreground">
                Joined: {new Date(partner.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {partner.updated_at && partner.updated_at !== partner.created_at && (
                <p className="text-[10px] text-muted-foreground">
                  Last updated: {new Date(partner.updated_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Completeness */}
        <ProfileCompletenessCard
          partner={partner}
          bankData={bankData}
          scheduleData={scheduleData}
          docsCount={docsData?.length || 0}
          conductAccepted={conductAccepted}
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

        {/* Bank — masked values */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" /> Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {bankData ? (
              <div className="space-y-1">
                <p>{bankData.bank_name} — {bankData.branch || "Branch not set"}</p>
                <Badge variant="outline" className={`text-[10px] ${
                  bankData.verification_status === "verified" ? "bg-success/10 text-success border-success/30" :
                  bankData.verification_status === "pending" ? "bg-warning/10 text-warning border-warning/30" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {bankData.verification_status === "pending" ? "Bank details saved — Pending verification" :
                   bankData.verification_status === "verified" ? "Bank verified" :
                   bankData.verification_status}
                </Badge>
              </div>
            ) : (
              <p>Bank details not provided yet</p>
            )}
          </CardContent>
        </Card>

        {/* Documents with verification states */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><FileCheck className="w-4 h-4 text-primary" /> Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {docsData && docsData.length > 0 ? (
              <div className="space-y-2">
                {docsData.map((d: any) => {
                  const statusCfg = DOC_STATUS_CONFIG[d.verification_status] || DOC_STATUS_CONFIG.pending;
                  return (
                    <div key={d.document_type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground capitalize">{d.document_type.replace(/_/g, " ")}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusCfg.className}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      {d.rejection_reason && (
                        <p className="text-[10px] text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {d.rejection_reason}
                        </p>
                      )}
                      {d.created_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Uploaded: {new Date(d.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            )}
          </CardContent>
        </Card>

        {/* Conduct / Policy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {conductAccepted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-foreground">Code of Conduct accepted</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Code of Conduct not yet accepted</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
