import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useOpsMetrics } from "@/services/opsMetricsService";
import {
  Zap, AlertTriangle, CheckCircle2, Users, ArrowRight,
  RefreshCw, MapPin, Radio, Flag, Clock, UserCheck, FileText,
} from "lucide-react";

interface EscalatedBooking {
  id: string;
  category_code: string;
  service_type: string | null;
  zone_code: string | null;
  is_emergency: boolean | null;
  dispatch_status: string | null;
  dispatch_round: number | null;
  created_at: string;
  status: string;
  customer_id: string | null;
}

function useEscalatedBookings() {
  return useQuery({
    queryKey: ["ops-escalated-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, category_code, service_type, zone_code, is_emergency, dispatch_status, dispatch_round, created_at, status, customer_id")
        .in("dispatch_status", ["escalated", "no_provider_found", "dispatching"])
        .not("status", "in", '("completed","cancelled")')
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as EscalatedBooking[];
    },
    refetchInterval: 15_000,
  });
}

function useActiveBookings() {
  return useQuery({
    queryKey: ["ops-active-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, category_code, service_type, zone_code, is_emergency, dispatch_status, dispatch_round, created_at, status, partner_id")
        .not("status", "in", '("completed","cancelled")')
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15_000,
  });
}

function useVerifiedPartners() {
  return useQuery({
    queryKey: ["ops-verified-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, full_name, business_name, availability_status, categories_supported, service_zones, rating_average, completed_jobs_count, verification_status, performance_score, reliability_tier")
        .eq("verification_status", "verified")
        .order("rating_average", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

function useDispatchEscalations() {
  return useQuery({
    queryKey: ["ops-dispatch-escalations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_escalations")
        .select("*")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15_000,
  });
}

/** Booking row with quote info for ops */
function OpsBookingRow({ booking: b }: { booking: any }) {
  const { data: quote } = useQuery({
    queryKey: ["ops-booking-quote", b.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, status, total_lkr, notes, technician_note")
        .eq("booking_id", b.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const timeSince = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
  };

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-sm font-medium font-mono">{b.id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">{b.category_code} • {b.service_type || "general"}</p>
        </div>
        <Badge variant="outline" className="text-[10px]">{b.status?.replace(/_/g, " ")}</Badge>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <MapPin className="w-3 h-3" /> {b.zone_code || "—"}
        {b.is_emergency && <Badge className="bg-destructive/10 text-destructive text-[9px] h-4">SOS</Badge>}
        <span className="ml-auto">{timeSince(b.created_at)}</span>
      </div>
      {quote && (
        <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-2 text-[10px]">
          <Badge variant="outline" className={`text-[9px] ${
            quote.status === "approved" ? "bg-success/10 text-success" :
            quote.status === "rejected" ? "bg-destructive/10 text-destructive" :
            quote.status === "submitted" ? "bg-warning/10 text-warning" :
            "bg-muted"
          }`}>
            Quote: {quote.status}
          </Badge>
          {quote.total_lkr && <span className="text-muted-foreground">LKR {quote.total_lkr.toLocaleString()}</span>}
          {(quote.technician_note || quote.notes) && (
            <span className="text-muted-foreground truncate max-w-[120px]">{quote.technician_note || quote.notes}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function DispatchBoardPage() {
  const navigate = useNavigate();
  const { data: escalatedBookings = [], isLoading: escalatedLoading } = useEscalatedBookings();
  const { data: activeBookings = [], isLoading: activeLoading } = useActiveBookings();
  const { data: partners = [] } = useVerifiedPartners();
  const { data: escalations = [] } = useDispatchEscalations();

  const [activeTab, setActiveTab] = useState<"escalated" | "active" | "partners" | "availability">("escalated");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");

  useEffect(() => { track("ops_dispatch_board_view"); }, []);

  const { data: metrics } = useOpsMetrics();

  const assigned = activeBookings.filter((b) => b.status === "assigned");
  const pending = activeBookings.filter((b) => b.dispatch_status === "pending_acceptance");
  const dispatching = activeBookings.filter((b) => b.dispatch_status === "dispatching");

  const stats = [
    { label: "Active", value: activeBookings.length, icon: Radio, color: "text-primary" },
    { label: "Escalated", value: escalatedBookings.length, icon: AlertTriangle, color: "text-destructive" },
    { label: "Pending", value: pending.length, icon: Clock, color: "text-warning" },
    { label: "Assigned", value: assigned.length, icon: CheckCircle2, color: "text-success" },
    { label: "Quotes", value: metrics?.quotes_pending_approval ?? 0, icon: FileText, color: "text-warning" },
    { label: "Avg Dispatch", value: metrics?.avg_dispatch_time_min != null ? `${metrics.avg_dispatch_time_min}m` : "—", icon: Clock, color: "text-muted-foreground" },
  ];

  const handleOpsAssign = async (bookingId: string) => {
    if (!selectedPartnerId) return;
    setAssigningId(bookingId);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      await fetch(`https://${projectId}.supabase.co/functions/v1/dispatch-accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${session.data.session?.access_token || anonKey}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          partner_id: selectedPartnerId,
          action: "ops_override",
          ops_user_id: session.data.session?.user?.id,
        }),
      });
    } finally {
      setAssigningId(null);
      setSelectedPartnerId("");
    }
  };

  const timeSince = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Operations Board
            </h1>
            <p className="text-xs text-muted-foreground">Live dispatch • Escalations • Manual assignment</p>
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
          {(["escalated", "active", "partners", "availability"] as const).map((tab) => (
            <Button key={tab} size="sm" className="flex-1 text-xs h-8"
              variant={activeTab === tab ? "default" : "ghost"}
              onClick={() => setActiveTab(tab)}>
              {tab === "escalated" ? `Escalated (${escalatedBookings.length})` : tab === "active" ? "Active" : tab === "availability" ? "📍 Map" : "Partners"}
            </Button>
          ))}
        </div>

        {/* Escalated Queue */}
        {activeTab === "escalated" && (
          <div className="space-y-3">
            {escalatedBookings.length === 0 && !escalatedLoading && (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No escalated bookings 🎉</CardContent></Card>
            )}
            {escalatedBookings.map((b) => (
              <Card key={b.id} className="border-destructive/30">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium font-mono">{b.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{b.category_code} • {b.service_type || "general"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`text-[10px] ${b.dispatch_status === "escalated" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                        {b.dispatch_status?.replace(/_/g, " ")}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{timeSince(b.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {b.zone_code || "Unknown zone"}
                    {b.is_emergency && <Badge className="bg-destructive/10 text-destructive text-[9px] h-4">EMERGENCY</Badge>}
                    <span>Round {b.dispatch_round || 0}</span>
                  </div>
                  {/* Manual assign */}
                  <div className="flex gap-1 items-center">
                    <select
                      className="flex-1 text-xs border rounded px-2 py-1 bg-background"
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                    >
                      <option value="">Select partner…</option>
                      {partners
                        .filter((p) => p.categories_supported.includes(b.category_code))
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.business_name || "Ind."}) ⭐{p.rating_average}</option>
                        ))}
                    </select>
                    <Button size="sm" className="text-xs h-7" disabled={!selectedPartnerId || assigningId === b.id}
                      onClick={() => handleOpsAssign(b.id)}>
                      <UserCheck className="w-3 h-3 mr-1" /> Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Unresolved escalations */}
            {escalations.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flag className="w-4 h-4 text-destructive" /> Escalation Log ({escalations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {escalations.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-2 border rounded text-xs">
                      <span className="font-mono">{e.booking_id?.slice(0, 8)}</span>
                      <span className="text-muted-foreground">{e.reason?.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">R{e.dispatch_rounds_attempted}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Active Bookings with Quote Info */}
        {activeTab === "active" && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Active Bookings ({activeBookings.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {activeBookings.length === 0 && !activeLoading && <p className="text-sm text-muted-foreground text-center py-4">No active bookings</p>}
              {activeBookings.map((b: any) => (
                <OpsBookingRow key={b.id} booking={b} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Partners */}
        {activeTab === "partners" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm"><Users className="w-4 h-4 text-primary inline mr-1" />Verified Partners ({partners.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {partners.map((p: any) => {
                const tierColors: Record<string, string> = {
                  elite: "bg-amber-500/15 text-amber-700",
                  pro: "bg-sky-500/15 text-sky-700",
                  verified: "bg-emerald-500/15 text-emerald-700",
                  under_review: "bg-red-500/15 text-red-700",
                };
                const tier = p.reliability_tier || "verified";
                return (
                  <div key={p.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{p.full_name}</p>
                        <Badge className={`border-0 text-[9px] ${tierColors[tier] || tierColors.verified}`}>
                          {tier === "under_review" ? "Review" : tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${p.availability_status === "available" ? "bg-success/10 text-success" : p.availability_status === "busy" ? "bg-warning/10 text-warning" : "bg-muted"}`}>
                        {p.availability_status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>⭐ {p.rating_average}</span>
                      <span>{p.completed_jobs_count} jobs</span>
                      <span>Score: {p.performance_score ?? "—"}</span>
                      <span>{(p.service_zones || []).length} zones</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p.categories_supported || []).slice(0, 4).map((cat: string) => (
                        <Badge key={cat} variant="secondary" className="text-[9px]">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Availability Map Tab */}
        {activeTab === "availability" && (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Technician Availability by Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  // Group partners by zone
                  const zoneMap = new Map<string, { online: number; busy: number; offline: number; partners: any[] }>();
                  partners.forEach((p: any) => {
                    const zones = (p.service_zones || ["Unassigned"]) as string[];
                    zones.forEach((zone: string) => {
                      if (!zoneMap.has(zone)) zoneMap.set(zone, { online: 0, busy: 0, offline: 0, partners: [] });
                      const z = zoneMap.get(zone)!;
                      if (p.availability_status === "online" || p.availability_status === "available") z.online++;
                      else if (p.availability_status === "busy") z.busy++;
                      else z.offline++;
                      z.partners.push(p);
                    });
                  });

                  const zones = Array.from(zoneMap.entries())
                    .sort((a, b) => (b[1].online + b[1].busy) - (a[1].online + a[1].busy));

                  if (zones.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No partners registered</p>;

                  return zones.map(([zone, data]) => (
                    <div key={zone} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{zone}</p>
                        <span className="text-[10px] text-muted-foreground">{data.partners.length} techs</span>
                      </div>
                      <div className="flex gap-3 text-[11px]">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-success" />
                          {data.online} online
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-warning" />
                          {data.busy} busy
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                          {data.offline} offline
                        </span>
                      </div>
                      {data.online === 0 && data.busy === 0 && (
                        <Badge variant="outline" className="mt-2 text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                          No coverage
                        </Badge>
                      )}
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            {/* Summary stats */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-success">{partners.filter((p: any) => p.availability_status === "online" || p.availability_status === "available").length}</p>
                    <p className="text-[10px] text-muted-foreground">Online Now</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-warning">{partners.filter((p: any) => p.availability_status === "busy").length}</p>
                    <p className="text-[10px] text-muted-foreground">Busy</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-muted-foreground">{partners.filter((p: any) => p.availability_status === "offline").length}</p>
                    <p className="text-[10px] text-muted-foreground">Offline</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Links */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 text-xs" onClick={() => navigate("/ops/finance")}>Finance Board</Button>
          <Button variant="outline" className="flex-1 text-xs" onClick={() => navigate("/ops/control-tower")}>Control Tower</Button>
        </div>
      </div>
    </div>
  );
}
