import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_PARTNERS, getTechniciansByPartner } from "@/data/mockPartnerData";
import { ArrowLeft, Building2, ShieldCheck, MapPin, Users, Phone } from "lucide-react";

const CURRENT_PARTNER = MOCK_PARTNERS[0];

export default function PartnerProfilePage() {
  const navigate = useNavigate();
  const techs = getTechniciansByPartner(CURRENT_PARTNER.id);

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
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{CURRENT_PARTNER.companyName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-success" />
                  <span className="text-xs text-success">Verified since {CURRENT_PARTNER.verifiedSince}</span>
                </div>
              </div>
            </div>
            {CURRENT_PARTNER.licenseNumber && (
              <p className="text-xs text-muted-foreground">License: {CURRENT_PARTNER.licenseNumber}</p>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-foreground">⭐ {CURRENT_PARTNER.rating}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-foreground">{CURRENT_PARTNER.jobsCompleted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Service Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {CURRENT_PARTNER.coverageZones.map((z) => (
                <Badge key={z} variant="secondary" className="text-xs">{z}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories Served</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {CURRENT_PARTNER.categories.map((c) => (
                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{techs.length} technicians</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Contact details will be configured in settings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
