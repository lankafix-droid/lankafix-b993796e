import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingStore } from "@/store/bookingStore";
import { MOCK_PARTNERS, getTechniciansByPartner } from "@/data/mockPartnerData";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { ArrowLeft, User, MapPin, Star } from "lucide-react";
import type { TechnicianAvailability } from "@/types/booking";

const CURRENT_PARTNER = MOCK_PARTNERS[0];

const AVAILABILITY_STYLES: Record<TechnicianAvailability, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-success/10 text-success border-success/20" },
  busy: { label: "Busy", color: "bg-warning/10 text-warning border-warning/20" },
  offline: { label: "Offline", color: "bg-muted text-muted-foreground border-muted" },
};

export default function TechniciansPage() {
  const navigate = useNavigate();
  const updateAvailability = useBookingStore((s) => s.updateTechnicianAvailability);
  const storedAvailability = useBookingStore((s) => s.techAvailability);
  const techs = getTechniciansByPartner(CURRENT_PARTNER.id);

  useEffect(() => { track("partner_technicians_view"); }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Technicians</h1>
          <p className="text-xs text-muted-foreground">{techs.length} technicians</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {techs.map((t) => {
          const currentStatus = storedAvailability[t.technicianId!] || t.availabilityStatus || "available";
          const style = AVAILABILITY_STYLES[currentStatus];
          return (
            <Card key={t.technicianId}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-foreground">{t.name}</p>
                      <Badge variant="outline" className={`text-[10px] ${style.color}`}>{style.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3" /> {t.rating}</span>
                      <span>{t.jobsCompleted} jobs</span>
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {t.currentZoneId}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.specializations.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[9px] px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Active jobs: {t.activeJobsCount ?? 0}</p>

                    <div className="flex gap-1.5 mt-3">
                      {(["available", "busy", "offline"] as TechnicianAvailability[]).map((status) => (
                        <Button key={status} size="sm" className="text-[10px] h-7 px-2"
                          variant={currentStatus === status ? "default" : "outline"}
                          onClick={() => updateAvailability(t.technicianId!, status)}>
                          {AVAILABILITY_STYLES[status].label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
