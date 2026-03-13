import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, RefreshCw, Loader2, CheckCircle2,
  ExternalLink, Filter, ShieldAlert,
} from "lucide-react";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-destructive/5 text-destructive/80 border-destructive/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const TYPE_LABELS: Record<string, string> = {
  dispatch_timeout: "Dispatch Timeout",
  dispatch_failed: "Dispatch Failed",
  sla_breach: "SLA Breach",
  payment_failed: "Payment Failed",
  partner_cancellation: "Partner Cancellation",
  rating_low: "Low Rating",
  supply_gap_detected: "Supply Gap",
  quote_stale: "Stale Quote",
  trust_recovery: "Trust Recovery",
  partner_low_acceptance: "Low Acceptance",
  partner_under_review: "Partner Under Review",
  emergency_booking: "Emergency Booking",
};

type FilterSeverity = "all" | "critical" | "high" | "medium" | "low";
type SourceFilter = "all" | "live" | "simulation";

export default function IncidentTrackerPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sevFilter, setSevFilter] = useState<FilterSeverity>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("live");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("automation_event_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = events;
    // Source filter
    if (sourceFilter === "live") list = list.filter(e => !(e.metadata as any)?.simulation);
    else if (sourceFilter === "simulation") list = list.filter(e => (e.metadata as any)?.simulation === true);
    if (sevFilter !== "all") list = list.filter(e => e.severity === sevFilter);
    if (typeFilter !== "all") list = list.filter(e => e.event_type === typeFilter);
    return list.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  }, [events, sevFilter, typeFilter, sourceFilter]);

  const severityCounts = useMemo(() => {
    const base = sourceFilter === "live" ? events.filter(e => !(e.metadata as any)?.simulation)
      : sourceFilter === "simulation" ? events.filter(e => (e.metadata as any)?.simulation === true)
      : events;
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    base.forEach(e => { c[e.severity] = (c[e.severity] || 0) + 1; });
    return c;
  }, [events, sourceFilter]);

  const eventTypes = useMemo(() => [...new Set(filtered.map(e => e.event_type))], [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/ops/control-tower")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" /> Incident Tracker
            </h1>
            <p className="text-[11px] text-muted-foreground">{filtered.length} incidents · {sourceFilter === "live" ? "Live only" : sourceFilter === "simulation" ? "Simulations only" : "All"}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Source filter */}
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] text-muted-foreground font-medium">Source:</span>
          {(["live", "simulation", "all"] as const).map(s => (
            <Badge
              key={s}
              variant={sourceFilter === s ? "default" : "outline"}
              className="text-[10px] cursor-pointer capitalize"
              onClick={() => setSourceFilter(s)}
            >
              {s === "live" ? "🟢 Live" : s === "simulation" ? "🔵 Simulation" : "All"}
            </Badge>
          ))}
        </div>

        {/* Severity summary */}
        <div className="grid grid-cols-4 gap-2">
          {(["critical", "high", "medium", "low"] as const).map(sev => (
            <Card
              key={sev}
              className={`p-3 text-center cursor-pointer ${sevFilter === sev ? "ring-2 ring-primary" : ""} ${sev === "critical" && severityCounts.critical > 0 ? "border-destructive/30" : ""}`}
              onClick={() => setSevFilter(sevFilter === sev ? "all" : sev)}
            >
              <p className={`text-lg font-bold ${sev === "critical" && severityCounts.critical > 0 ? "text-destructive" : sev === "high" && severityCounts.high > 0 ? "text-destructive/80" : "text-foreground"}`}>
                {severityCounts[sev]}
              </p>
              <p className="text-[9px] text-muted-foreground capitalize">{sev}</p>
            </Card>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant={typeFilter === "all" ? "default" : "outline"} className="text-[10px] cursor-pointer" onClick={() => setTypeFilter("all")}>All Types</Badge>
          {eventTypes.map(t => (
            <Badge key={t} variant={typeFilter === t ? "default" : "outline"} className="text-[10px] cursor-pointer" onClick={() => setTypeFilter(t)}>
              {TYPE_LABELS[t] || t.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>

        {/* Events list */}
        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-2">
            {filtered.length === 0 && (
              <Card className="p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No incidents match current filters</p>
              </Card>
            )}
            {filtered.map(e => {
              const meta = (e.metadata || {}) as any;
              const isSimulation = meta.simulation === true;
              return (
                <Card key={e.id} className={`border ${SEVERITY_STYLES[e.severity] || ""}`}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[9px] px-1.5 ${SEVERITY_STYLES[e.severity] || ""}`}>
                        {e.severity}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {TYPE_LABELS[e.event_type] || e.event_type.replace(/_/g, " ")}
                      </span>
                      {isSimulation && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">SIM</Badge>}
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {new Date(e.created_at).toLocaleString("en-LK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{e.trigger_reason}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      {e.booking_id && (
                        <button
                          className="flex items-center gap-0.5 text-primary hover:underline"
                          onClick={(ev) => { ev.stopPropagation(); navigate(`/track/${e.booking_id}`); }}
                        >
                          <ExternalLink className="w-3 h-3" /> {e.booking_id.slice(0, 8)}
                        </button>
                      )}
                      <span>Action: {e.action_taken}</span>
                      {e.reversible && <Badge variant="outline" className="text-[8px]">Reversible</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
