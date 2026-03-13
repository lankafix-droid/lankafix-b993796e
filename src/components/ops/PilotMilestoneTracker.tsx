import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, CheckCircle2, Clock, TrendingUp } from "lucide-react";

const MILESTONES = [10, 25, 50, 100];

export default function PilotMilestoneTracker() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, status, created_at, customer_rating, final_price_lkr, assigned_at, completed_at, cancelled_at, payment_status")
        .neq("booking_source", "pilot_simulation")
        .order("created_at", { ascending: true })
        .limit(500);
      setBookings(data || []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === "completed");
    const cancelled = bookings.filter(b => b.status === "cancelled");
    const rated = completed.filter(b => b.customer_rating != null);
    const avgRating = rated.length > 0 ? (rated.reduce((s, b) => s + b.customer_rating, 0) / rated.length).toFixed(1) : "—";
    const completionRate = total > 0 ? Math.round(completed.length / total * 100) : 0;

    // Avg dispatch time (created → assigned)
    const dispatchTimes = bookings.filter(b => b.assigned_at).map(b =>
      (new Date(b.assigned_at).getTime() - new Date(b.created_at).getTime()) / 60000
    );
    const avgDispatch = dispatchTimes.length ? Math.round(dispatchTimes.reduce((a, b) => a + b, 0) / dispatchTimes.length) : 0;

    // Milestones
    const milestoneData = MILESTONES.map(m => {
      if (total < m) return { target: m, reached: false, date: null, ratingAtMilestone: null, completionAtMilestone: null };
      const subset = bookings.slice(0, m);
      const comp = subset.filter(b => b.status === "completed");
      const r = comp.filter(b => b.customer_rating != null);
      return {
        target: m,
        reached: true,
        date: subset[m - 1]?.created_at ? new Date(subset[m - 1].created_at).toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" }) : null,
        ratingAtMilestone: r.length > 0 ? (r.reduce((s: number, b: any) => s + b.customer_rating, 0) / r.length).toFixed(1) : "—",
        completionAtMilestone: subset.length > 0 ? Math.round(comp.length / subset.length * 100) : 0,
      };
    });

    return { total, completed: completed.length, cancelled: cancelled.length, avgRating, completionRate, avgDispatchMin: avgDispatch, milestones: milestoneData };
  }, [bookings]);

  const nextMilestone = MILESTONES.find(m => stats.total < m) || 100;
  const progress = Math.min(100, Math.round((stats.total / nextMilestone) * 100));

  if (loading) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" /> First 100 Bookings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-foreground">{stats.total} bookings</span>
              <span className="text-muted-foreground">Next milestone: {nextMilestone}</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>

          {/* Summary metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2.5 rounded-lg border border-border bg-card">
              <p className="text-sm font-bold text-emerald-600">{stats.completed}</p>
              <p className="text-[9px] text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-2.5 rounded-lg border border-border bg-card">
              <p className="text-sm font-bold text-foreground">{stats.avgRating}</p>
              <p className="text-[9px] text-muted-foreground">Avg Rating</p>
            </div>
            <div className="text-center p-2.5 rounded-lg border border-border bg-card">
              <p className="text-sm font-bold text-foreground">{stats.completionRate}%</p>
              <p className="text-[9px] text-muted-foreground">Completion</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2.5 rounded-lg border border-border bg-card">
              <p className="text-sm font-bold text-destructive/80">{stats.cancelled}</p>
              <p className="text-[9px] text-muted-foreground">Cancelled</p>
            </div>
            <div className="text-center p-2.5 rounded-lg border border-border bg-card">
              <p className="text-sm font-bold text-foreground">{stats.avgDispatchMin > 0 ? `${stats.avgDispatchMin}m` : "—"}</p>
              <p className="text-[9px] text-muted-foreground">Avg Dispatch</p>
            </div>
            <div className="text-center p-2.5 rounded-lg border border-border bg-card">
              <p className="text-sm font-bold text-foreground">{stats.total}</p>
              <p className="text-[9px] text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Milestones
            </p>
            {stats.milestones.map(m => (
              <div key={m.target} className={`flex items-center gap-3 p-2.5 rounded-lg border ${m.reached ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card opacity-50"}`}>
                {m.reached
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{m.target} bookings</p>
                  {m.reached && m.date && (
                    <p className="text-[10px] text-muted-foreground">
                      Reached {m.date} · Rating: {m.ratingAtMilestone} · Completion: {m.completionAtMilestone}%
                    </p>
                  )}
                  {!m.reached && (
                    <p className="text-[10px] text-muted-foreground">
                      {m.target - stats.total} more bookings to go
                    </p>
                  )}
                </div>
                {m.reached && <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✓</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
