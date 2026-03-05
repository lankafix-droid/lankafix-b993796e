import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookingStore } from "@/store/bookingStore";
import { useProviderERPStore } from "@/store/providerERPStore";
import { MOCK_PARTNERS } from "@/data/mockPartnerData";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { ArrowLeft, User, MapPin, Star, Settings, Clock, Gauge } from "lucide-react";
import type { TechnicianAvailability } from "@/types/booking";
import { SHIFT_DAY_LABELS } from "@/types/provider";
import type { ShiftDay } from "@/types/provider";

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
  const { getTechniciansByProvider, updateTechnicianShift, updateTechnicianCapacity, getFleetSummary } = useProviderERPStore();
  const techProfiles = getTechniciansByProvider(CURRENT_PARTNER.id);
  const fleet = getFleetSummary(CURRENT_PARTNER.id);

  const [editingTech, setEditingTech] = useState<string | null>(null);

  useEffect(() => { track("partner_technicians_view"); }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Fleet Management</h1>
          <p className="text-xs text-muted-foreground">{techProfiles.length} technicians</p>
        </div>
      </div>

      {/* Fleet Summary */}
      <div className="p-4 pb-0">
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-card border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{fleet.totalTechnicians}</p>
            <p className="text-[9px] text-muted-foreground">Total</p>
          </div>
          <div className="bg-card border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-success">{fleet.online}</p>
            <p className="text-[9px] text-muted-foreground">Online</p>
          </div>
          <div className="bg-card border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-warning">{fleet.busy}</p>
            <p className="text-[9px] text-muted-foreground">Busy</p>
          </div>
          <div className="bg-card border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-muted-foreground">{fleet.offline}</p>
            <p className="text-[9px] text-muted-foreground">Offline</p>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 space-y-3">
        {techProfiles.map((t) => {
          const currentStatus = storedAvailability[t.technicianId] || "available";
          const style = AVAILABILITY_STYLES[currentStatus as TechnicianAvailability];
          const isEditing = editingTech === t.technicianId;

          return (
            <Card key={t.technicianId}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-foreground">{t.technicianName}</p>
                      <Badge variant="outline" className={`text-[10px] ${style.color}`}>{style.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3" /> {t.ratingScore}</span>
                      <span>{t.totalCompletedJobs} jobs</span>
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {t.currentZone}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.skillsCategories.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[9px] px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>

                    {/* Performance & Capacity */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Gauge className="w-3 h-3" /> Score: {t.performanceScore}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {t.shift.startTime}–{t.shift.endTime}</span>
                      <span>Cap: {t.todayJobCount}/{t.dailyJobCapacity}</span>
                    </div>

                    {/* Certifications */}
                    {t.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.certifications.map((c) => (
                          <Badge key={c} variant="outline" className="text-[8px] px-1 py-0 bg-success/5 text-success border-success/20">✓ {c}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Availability toggles */}
                    <div className="flex gap-1.5 mt-3">
                      {(["available", "busy", "offline"] as TechnicianAvailability[]).map((status) => (
                        <Button key={status} size="sm" className="text-[10px] h-7 px-2"
                          variant={currentStatus === status ? "default" : "outline"}
                          onClick={() => updateAvailability(t.technicianId, status)}>
                          {AVAILABILITY_STYLES[status].label}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" className="text-[10px] h-7 px-2" onClick={() => setEditingTech(isEditing ? null : t.technicianId)}>
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Editable Shift & Capacity */}
                    {isEditing && (
                      <div className="mt-3 border-t pt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Shift Start</Label>
                            <Input type="time" className="h-8 text-xs" value={t.shift.startTime}
                              onChange={(e) => updateTechnicianShift(t.technicianId, { ...t.shift, startTime: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Shift End</Label>
                            <Input type="time" className="h-8 text-xs" value={t.shift.endTime}
                              onChange={(e) => updateTechnicianShift(t.technicianId, { ...t.shift, endTime: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px]">Working Days</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Object.entries(SHIFT_DAY_LABELS) as [ShiftDay, string][]).map(([day, label]) => (
                              <Button key={day} size="sm" className="text-[9px] h-6 px-1.5"
                                variant={t.shift.workingDays.includes(day) ? "default" : "outline"}
                                onClick={() => {
                                  const days = t.shift.workingDays.includes(day)
                                    ? t.shift.workingDays.filter((d) => d !== day)
                                    : [...t.shift.workingDays, day];
                                  updateTechnicianShift(t.technicianId, { ...t.shift, workingDays: days });
                                }}>
                                {label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Daily Capacity</Label>
                            <Input type="number" className="h-8 text-xs" value={t.dailyJobCapacity}
                              onChange={(e) => updateTechnicianCapacity(t.technicianId, parseInt(e.target.value) || 1, t.maxConcurrentJobs)} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Max Concurrent</Label>
                            <Input type="number" className="h-8 text-xs" value={t.maxConcurrentJobs}
                              onChange={(e) => updateTechnicianCapacity(t.technicianId, t.dailyJobCapacity, parseInt(e.target.value) || 1)} />
                          </div>
                        </div>
                      </div>
                    )}
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
