import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingStore } from "@/store/bookingStore";
import { useProviderERPStore } from "@/store/providerERPStore";
import { MOCK_TECHNICIANS } from "@/data/mockPartnerData";
import { getTechPerformanceMetrics, TECHNICIAN_CAPABILITIES } from "@/lib/dispatchEngine";
import { VERIFICATION_STATUS_STYLES } from "@/types/provider";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import {
  Zap, AlertTriangle, CheckCircle2, Users, ArrowRight,
  RefreshCw, MapPin, ShieldCheck, Radio, Flag, Gauge,
  XCircle,
} from "lucide-react";

export default function DispatchBoardPage() {
  const navigate = useNavigate();
  const bookings = useBookingStore((s) => s.bookings);
  const opsAssignTechnician = useBookingStore((s) => s.opsAssignTechnician);
  const opsEscalateJob = useBookingStore((s) => s.opsEscalateJob);
  const opsMoveToManualQueue = useBookingStore((s) => s.opsMoveToManualQueue);
  const { providers, technicians, disputes, updateProviderVerification, resolveDispute } = useProviderERPStore();

  useEffect(() => { track("ops_dispatch_board_view"); }, []);

  const [selectedTech, setSelectedTech] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"dispatch" | "providers" | "disputes">("dispatch");

  const activeBookings = bookings.filter((b) => !["completed", "rated", "cancelled"].includes(b.status));
  const matching = bookings.filter((b) => b.status === "matching");
  const awaitingConfirm = bookings.filter((b) => b.status === "awaiting_partner_confirmation");
  const assigned = bookings.filter((b) => b.status === "assigned");
  const stuck = bookings.filter((b) => b.status === "matching" && b.timelineEvents.length > 3);
  const openDisputes = disputes.filter((d) => d.status === "open" || d.status === "under_review");

  const stats = [
    { label: "Active", value: activeBookings.length, icon: Radio, color: "text-primary" },
    { label: "Matching", value: matching.length, icon: RefreshCw, color: "text-warning" },
    { label: "Assigned", value: assigned.length, icon: CheckCircle2, color: "text-success" },
    { label: "Disputes", value: openDisputes.length, icon: Flag, color: "text-destructive" },
  ];

  const handleForceAssign = (jobId: string) => {
    if (!selectedTech) return;
    opsAssignTechnician(jobId, selectedTech);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Operations Board
            </h1>
            <p className="text-xs text-muted-foreground">Dispatch • Providers • Disputes</p>
          </div>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">OPS ONLY</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(["dispatch", "providers", "disputes"] as const).map((tab) => (
            <Button key={tab} size="sm" className="flex-1 text-xs h-8"
              variant={activeTab === tab ? "default" : "ghost"}
              onClick={() => setActiveTab(tab)}>
              {tab === "dispatch" ? "Dispatch" : tab === "providers" ? "Providers" : `Disputes (${openDisputes.length})`}
            </Button>
          ))}
        </div>

        {activeTab === "dispatch" && (
          <>
            {/* Stuck Jobs */}
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
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => opsMoveToManualQueue(b.jobId)}>Manual</Button>
                        <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => opsEscalateJob(b.jobId, "Stuck")}>Escalate</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Technicians */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Technicians</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MOCK_TECHNICIANS.map((t) => {
                  const perf = getTechPerformanceMetrics(t.technicianId || "");
                  const caps = TECHNICIAN_CAPABILITIES[t.technicianId || ""];
                  const profile = technicians.find((tp) => tp.technicianId === t.technicianId);
                  return (
                    <div key={t.technicianId}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedTech === t.technicianId ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                      onClick={() => setSelectedTech(t.technicianId || "")}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{t.name}</span>
                          <Badge variant="outline" className={`text-[10px] ${t.availabilityStatus === "available" ? "bg-success/10 text-success" : t.availabilityStatus === "busy" ? "bg-warning/10 text-warning" : "bg-muted"}`}>
                            {t.availabilityStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{profile?.performanceScore || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>⭐ {t.rating}</span>
                        <span>{t.jobsCompleted} jobs</span>
                        <span>{perf?.acceptanceRate ?? 0}% acc</span>
                        {profile && <span>Cap: {profile.todayJobCount}/{profile.dailyJobCapacity}</span>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Active Bookings */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Active Bookings</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {activeBookings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active bookings</p>}
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
          </>
        )}

        {activeTab === "providers" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">All Providers ({providers.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {providers.map((p) => {
                const style = VERIFICATION_STATUS_STYLES[p.verificationStatus];
                const techCount = technicians.filter((t) => t.providerId === p.providerId).length;
                return (
                  <div key={p.providerId} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{p.companyName}</p>
                      <Badge className={`text-[10px] ${style.color}`}>{style.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                      <span>⭐ {p.ratingScore}</span>
                      <span>{p.totalCompletedJobs} jobs</span>
                      <span>{techCount} techs</span>
                      <span>{p.operatingZones.length} zones</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.serviceCategories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-[9px]">{cat}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {p.verificationStatus !== "verified" && (
                        <Button size="sm" variant="default" className="text-xs h-7" onClick={() => updateProviderVerification(p.providerId, "verified")}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Verify
                        </Button>
                      )}
                      {p.verificationStatus !== "suspended" && (
                        <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => updateProviderVerification(p.providerId, "suspended")}>
                          <XCircle className="w-3 h-3 mr-1" /> Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {activeTab === "disputes" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Flag className="w-4 h-4 text-destructive" /> Open Disputes ({openDisputes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {openDisputes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No open disputes</p>}
              {openDisputes.map((d) => (
                <div key={d.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{d.jobId}</p>
                    <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">{d.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Raised by: {d.raisedBy} • {d.reason.replace(/_/g, " ")}</p>
                  <p className="text-xs text-foreground mb-2">{d.description}</p>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => resolveDispute(d.id, "Resolved by ops")}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 text-xs" onClick={() => navigate("/ops/finance")}>Finance Board</Button>
          <Button variant="outline" className="flex-1 text-xs" onClick={() => navigate("/ops/subscriptions")}>Subscriptions</Button>
        </div>
      </div>
    </div>
  );
}
