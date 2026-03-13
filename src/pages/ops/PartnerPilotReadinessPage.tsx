import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, RefreshCw, Loader2, Users, CheckCircle2, AlertTriangle, XCircle, Star, Clock, TrendingUp, Trophy,
} from "lucide-react";
import { CATEGORY_LABELS, type CategoryCode } from "@/types/booking";

const PHASE1_CATS = ["AC", "MOBILE", "CONSUMER_ELEC", "IT"];
const catLabel = (c: string) => CATEGORY_LABELS[c as CategoryCode] || c;

interface CatMetrics {
  code: string;
  verified: number;
  activeToday: number;
  avgAcceptRate: number;
  avgCancelRate: number;
  avgResponseMin: number;
  avgRating: number;
  status: "healthy" | "attention" | "critical";
}

export default function PartnerPilotReadinessPage() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("partners").select("*");
    setPartners(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const metrics: CatMetrics[] = useMemo(() => {
    return PHASE1_CATS.map(code => {
      const catPartners = partners.filter(p =>
        (p.categories_supported || []).some((c: string) => c.toUpperCase() === code)
      );
      const verified = catPartners.filter(p => p.verification_status === "verified");
      const active = verified.filter(p => p.availability_status !== "offline");

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const acceptRates = verified.map(p => p.acceptance_rate ?? 0).filter(r => r > 0);
      const cancelRates = verified.map(p => p.cancellation_rate ?? 0);
      const responseTimes = verified.map(p => p.average_response_time_minutes ?? 0).filter(r => r > 0);
      const ratings = verified.map(p => p.rating_average ?? 0).filter(r => r > 0);

      const avgAccept = avg(acceptRates);
      const avgCancel = avg(cancelRates);
      const avgRat = avg(ratings);

      let status: CatMetrics["status"] = "healthy";
      if (verified.length === 0 || avgAccept < 40 || avgRat < 3) status = "critical";
      else if (avgAccept < 60 || avgCancel > 30 || avgRat < 3.5) status = "attention";

      return {
        code, verified: verified.length, activeToday: active.length,
        avgAcceptRate: Math.round(avgAccept), avgCancelRate: Math.round(avgCancel),
        avgResponseMin: Math.round(avg(responseTimes)), avgRating: parseFloat(avg(ratings).toFixed(1)),
        status,
      };
    });
  }, [partners]);

  const totalVerified = partners.filter(p => p.verification_status === "verified").length;
  const totalActive = partners.filter(p => p.availability_status !== "offline").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const statusIcon = (s: CatMetrics["status"]) =>
    s === "healthy" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
    s === "attention" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
    <XCircle className="w-4 h-4 text-destructive" />;

  const statusBadge = (s: CatMetrics["status"]) => (
    <Badge variant="outline" className={`text-[9px] ${
      s === "healthy" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
      s === "attention" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
      "bg-destructive/10 text-destructive border-destructive/20"
    }`}>
      {s === "healthy" ? "Healthy" : s === "attention" ? "Attention" : "Critical"}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/ops/control-tower")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Partner Pilot Readiness
            </h1>
            <p className="text-[11px] text-muted-foreground">Phase-1 partner health overview</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{totalVerified}</p>
            <p className="text-[9px] text-muted-foreground">Verified</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{totalActive}</p>
            <p className="text-[9px] text-muted-foreground">Active Now</p>
          </Card>
          <Card className="p-3 text-center">
            <p className={`text-lg font-bold ${metrics.some(m => m.status === "critical") ? "text-destructive" : "text-emerald-600"}`}>
              {metrics.filter(m => m.status === "healthy").length}/{PHASE1_CATS.length}
            </p>
            <p className="text-[9px] text-muted-foreground">Healthy</p>
          </Card>
        </div>

        {/* Per-category cards */}
        {metrics.map(m => (
          <Card key={m.code} className={`${m.status === "critical" ? "border-destructive/30" : m.status === "attention" ? "border-amber-500/30" : ""}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {statusIcon(m.status)}
                  {catLabel(m.code)}
                </CardTitle>
                {statusBadge(m.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-sm font-bold text-foreground">{m.verified}</p>
                  <p className="text-[9px] text-muted-foreground">Verified</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{m.activeToday}</p>
                  <p className="text-[9px] text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{m.avgRating || "—"}</p>
                  <p className="text-[9px] text-muted-foreground">Avg Rating</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">Acceptance Rate</span>
                    <span className={m.avgAcceptRate < 40 ? "text-destructive font-semibold" : m.avgAcceptRate < 60 ? "text-amber-600 font-semibold" : "text-foreground"}>{m.avgAcceptRate}%</span>
                  </div>
                  <Progress value={m.avgAcceptRate} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">Cancellation Rate</span>
                    <span className={m.avgCancelRate > 30 ? "text-destructive font-semibold" : "text-foreground"}>{m.avgCancelRate}%</span>
                  </div>
                  <Progress value={m.avgCancelRate} className="h-1.5" />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="text-foreground">{m.avgResponseMin > 0 ? `${m.avgResponseMin}m` : "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
