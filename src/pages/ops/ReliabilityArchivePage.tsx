/**
 * Reliability Archive — 30-day trend, score history, verdict evolution.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, TrendingUp, Calendar } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import ZoneReliabilityMatrix from "@/components/ops/ZoneReliabilityMatrix";
import type { ReliabilityVerdict } from "@/engines/reliabilityGovernanceEngine";

interface Snapshot {
  id: string;
  created_at: string;
  reliability_score: number;
  success_rate: number;
  escalation_rate: number;
  circuit_break_count: number;
  confidence_score: number;
  executive_verdict: string;
  risk_probability: number;
  zone_summary_json: any;
}

const VERDICT_COLORS: Record<string, string> = {
  STABLE: "text-success",
  GUARDED: "text-warning",
  RISK: "text-destructive",
  CRITICAL: "text-destructive",
};

export default function ReliabilityArchivePage() {
  const navigate = useNavigate();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["reliability-snapshots"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("reliability_snapshots")
        .select("*")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(30);
      return (data as Snapshot[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const maxScore = Math.max(...snapshots.map(s => s.reliability_score), 0);
  const minScore = Math.min(...snapshots.map(s => s.reliability_score), 100);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl safe-area-top">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Reliability Archive</h1>
          <Badge variant="outline" className="text-[10px]">30-Day Ledger</Badge>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-12">Loading snapshots…</div>
        ) : snapshots.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              No reliability snapshots recorded yet. Snapshots are generated daily.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Latest Score */}
            {latest && (
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Latest Reliability Score</span>
                    <Badge variant="outline" className={`${VERDICT_COLORS[latest.executive_verdict] || "text-muted-foreground"}`}>
                      {latest.executive_verdict}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{latest.reliability_score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground">{latest.success_rate}%</p>
                      <p className="text-[9px] text-muted-foreground">Success</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground">{latest.escalation_rate}%</p>
                      <p className="text-[9px] text-muted-foreground">Escalation</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground">{latest.risk_probability}%</p>
                      <p className="text-[9px] text-muted-foreground">Risk</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 30-Day Trend (text-based mini chart) */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  30-Day Score Trend
                </h3>
                <div className="flex items-end gap-[2px] h-16">
                  {snapshots.map((s, i) => {
                    const height = maxScore > minScore
                      ? ((s.reliability_score - minScore) / (maxScore - minScore)) * 100
                      : 50;
                    const color = s.reliability_score >= 85 ? "bg-success" :
                      s.reliability_score >= 65 ? "bg-warning" :
                      s.reliability_score >= 40 ? "bg-destructive/70" : "bg-destructive";
                    return (
                      <div
                        key={s.id}
                        className={`flex-1 rounded-t ${color} min-h-[2px]`}
                        style={{ height: `${Math.max(5, height)}%` }}
                        title={`${new Date(s.created_at).toLocaleDateString()}: ${s.reliability_score}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">
                    {snapshots[0] && new Date(snapshots[0].created_at).toLocaleDateString()}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {latest && new Date(latest.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Verdict Evolution */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  Verdict History
                </h3>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {[...snapshots].reverse().map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                      <span className="text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.reliability_score}</span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${VERDICT_COLORS[s.executive_verdict] || ""}`}>
                          {s.executive_verdict}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Zone Summary from latest */}
            {latest?.zone_summary_json && Array.isArray(latest.zone_summary_json) && latest.zone_summary_json.length > 0 && (
              <ZoneReliabilityMatrix zones={latest.zone_summary_json} />
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
