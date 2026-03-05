import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingStore } from "@/store/bookingStore";
import { MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import { getTechPerformanceMetrics, TECHNICIAN_CAPABILITIES } from "@/lib/dispatchEngine";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import {
  Zap, AlertTriangle, CheckCircle2, XCircle, Users, ArrowRight,
  RefreshCw, MapPin, ShieldCheck, Radio,
} from "lucide-react";

export default function DispatchBoardPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);
  const opsAssignTechnician = useBookingStore((s) => s.opsAssignTechnician);
  const opsEscalateJob = useBookingStore((s) => s.opsEscalateJob);
  const opsMoveToManualQueue = useBookingStore((s) => s.opsMoveToManualQueue);

  useEffect(() => { track("ops_dispatch_board_view"); }, []);

  const [selectedTech, setSelectedTech] = useState<string>("");

  const activeBookings = bookings.filter((b) => !["completed", "rated", "cancelled"].includes(b.status));
  const matching = bookings.filter((b) => b.status === "matching");
  const awaitingConfirm = bookings.filter((b) => b.status === "awaiting_partner_confirmation");
  const assigned = bookings.filter((b) => b.status === "assigned");
  const stuck = bookings.filter((b) => b.status === "matching" && b.timelineEvents.length > 3);

  const stats = [
    { label: "Active Bookings", value: activeBookings.length, icon: Radio, color: "text-primary" },
    { label: "Matching", value: matching.length, icon: RefreshCw, color: "text-warning" },
    { label: "Awaiting Confirm", value: awaitingConfirm.length, icon: AlertTriangle, color: "text-warning" },
    { label: "Assigned", value: assigned.length, icon: CheckCircle2, color: "text-success" },
  ];

  const handleForceAssign = (jobId: string) => {
    if (!selectedTech) return;
    opsAssignTechnician(jobId, selectedTech);
    track("ops_force_assign", { jobId, technicianId: selectedTech });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Dispatch Board
            </h1>
            <p className="text-xs text-muted-foreground">Operations Control Panel</p>
          </div>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
            OPS ONLY
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-[11px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stuck / Needs Attention */}
        {stuck.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" /> Stuck Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stuck.map((b) => (
                <div key={b.jobId} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{b.jobId}</p>
                    <p className="text-xs text-muted-foreground">{b.categoryName} • {b.zone}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => opsMoveToManualQueue(b.jobId)}>
                      Manual Queue
                    </Button>
                    <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => opsEscalateJob(b.jobId, "Stuck in matching")}>
                      Escalate
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Technician Ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Technician Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {MOCK_TECHNICIANS.map((t) => {
              const perf = getTechPerformanceMetrics(t.technicianId || "");
              const caps = TECHNICIAN_CAPABILITIES[t.technicianId || ""];
              return (
                <div
                  key={t.technicianId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedTech === t.technicianId ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedTech(t.technicianId || "")}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${t.availabilityStatus === "available" ? "bg-success/10 text-success" : t.availabilityStatus === "busy" ? "bg-warning/10 text-warning" : "bg-muted"}`}>
                        {t.availabilityStatus}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">⭐ {t.rating}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>{t.jobsCompleted} jobs</span>
                    <span>{perf?.experienceYears ?? 0}y exp</span>
                    <span>{perf?.acceptanceRate ?? 0}% accept</span>
                    <span>Profile: {perf?.profileStrength ?? 0}%</span>
                  </div>
                  {caps && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {caps.skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[9px] h-4">{s}</Badge>
                      ))}
                      <Badge variant="outline" className="text-[9px] h-4">{caps.vehicleType}</Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* All Active Bookings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">All Active Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeBookings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active bookings</p>
            )}
            {activeBookings.map((b) => (
              <div key={b.jobId} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{b.jobId}</p>
                    <p className="text-xs text-muted-foreground">{b.categoryName} • {b.serviceName}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{b.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" /> {b.zone}
                  {b.isEmergency && <Badge className="bg-destructive/10 text-destructive text-[9px] h-4">EMERGENCY</Badge>}
                  {b.technician && <span>→ {b.technician.name}</span>}
                </div>
                <div className="flex gap-1">
                  {["matching", "awaiting_partner_confirmation"].includes(b.status) && selectedTech && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleForceAssign(b.jobId)}>
                      <ShieldCheck className="w-3 h-3 mr-1" /> Force Assign
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate(`/partner/job/${b.jobId}`)}>
                    Details <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
