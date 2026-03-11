import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrentPartner } from "@/hooks/useCurrentPartner";
import { ArrowLeft, Building2, ShieldCheck, MapPin, Users, Phone, Camera, Wrench, Star, CheckCircle2, XCircle, Loader2, UserPlus } from "lucide-react";

function ProfileCompletenessCard({ partner }: { partner: any }) {
  const checks = [
    { label: "Identity complete", done: !!partner.full_name && !!partner.phone_number },
    { label: "Categories selected", done: partner.categories_supported?.length > 0 },
    { label: "Zones selected", done: partner.service_zones?.length > 0 },
    { label: "Profile photo added", done: !!partner.profile_photo_url },
    { label: "Verification status", done: partner.verification_status === "verified" },
  ];
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

        <ProfileCompletenessCard partner={partner} />

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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{partner.phone_number}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
