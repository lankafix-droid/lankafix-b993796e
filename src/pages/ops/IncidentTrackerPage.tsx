import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, RefreshCw, Loader2, AlertTriangle, CheckCircle2, XCircle,
  ExternalLink, Filter, ShieldAlert,
} from "lucide-react";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-destructive/5 text-destructive/80 border-destructive/20",
  medium: "bg-warning/10 text-warning-foreground border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

const INCIDENT_TYPES = [
  "dispatch_timeout", "dispatch_failed", "sla_breach", "payment_failed",
  "partner_cancellation", "rating_low", "supply_gap_detected", "quote_stale",
  "trust_recovery", "partner_low_acceptance", "partner_under_review",
];

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

export default function IncidentTrackerPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sevFilter, setSevFilter] = useState<FilterSeverity>("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("automation_event_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = events;
    if (sevFilter !== "all") list = list.filter(e => e.severity === sevFilter);
    if (typeFilter !== "all") list = list.filter(e => e.event_type === typeFilter);
    return list.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  }, [events, sevFilter, typeFilter]);

  const severityCounts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    events.forEach(e => { c[e.severity] = (c[e.severity] || 0) + 1; });
    return c;
  }, [events]);

  const eventTypes = useMemo(() => [...new Set(events.map(e => e.event_type))], [events]);

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
            <p className="text-[11px] text-muted-foreground">{events.length} events logged</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Severity summary */}
        <div className="grid grid-cols-4 gap-2">
          {(["critical", "high", "medium", "low"] as const).map(sev => (
            <Card
              key={sev}
              className={`p-3 text-center cursor-pointer ${sevFilter === sev ? "ring-2 ring-primary" : ""} ${sev === "critical" && severityCounts.critical > 0 ? "border-destructive/30" : ""}`}
              onClick={() => setSevFilter(sevFilter === sev ? "all" : sev)}
            >
              <p className={`text-lg font-bold ${sev === "critical" && severityCounts.critical > 0 ? "text-destructive" : "text-foreground"}`}>
                {severityCounts[sev]}
              </p>
              <p className="text-[9px] text-muted-foreground capitalize">{sev}</p>
            </Card>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant={typeFilter === "all" ? "default" : "outline"} className="text-[10px] cursor-pointer" onClick={() => setTypeFilter("all")}>All</Badge>
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
              const meta = e.metadata || {};
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
                      {isSimulation && <Badge variant="outline" className="text-[9px] bg-accent/50">SIM</Badge>}
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {new Date(e.created_at).toLocaleString("en-LK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{e.trigger_reason}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      {e.booking_id && (
                        <button
                          className="flex items-center gap-0.5 text-primary hover:underline"
                          onClick={() => navigate(`/track/${e.booking_id}`)}
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
