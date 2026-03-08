/**
 * BypassMonitorPage — Admin dashboard for monitoring anti-bypass signals.
 */
import { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, MessageCircle, UserX, Eye, Ban, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { calculateBypassRiskScore } from "@/engines/antiBypassEngine";

interface BypassAttempt {
  id: string;
  booking_id: string | null;
  actor_id: string;
  actor_role: string;
  attempt_type: string;
  detected_content: string | null;
  action_taken: string | null;
  created_at: string;
}

interface PartnerWarning {
  id: string;
  partner_id: string;
  warning_type: string;
  severity: string;
  description: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function BypassMonitorPage() {
  const [attempts, setAttempts] = useState<BypassAttempt[]>([]);
  const [warnings, setWarnings] = useState<PartnerWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("bypass_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("partner_warnings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]).then(([attRes, warnRes]) => {
      setAttempts((attRes.data as BypassAttempt[]) || []);
      setWarnings((warnRes.data as PartnerWarning[]) || []);
      setLoading(false);
    });
  }, []);

  const stats = {
    totalAttempts: attempts.length,
    todayAttempts: attempts.filter((a) => new Date(a.created_at).toDateString() === new Date().toDateString()).length,
    partnerAttempts: attempts.filter((a) => a.actor_role === "partner").length,
    activeWarnings: warnings.filter((w) => !w.resolved_at).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-destructive" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Bypass Monitor</h1>
            <p className="text-sm text-muted-foreground">Platform protection & anti-bypass tracking</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Attempts" value={stats.totalAttempts} icon={<AlertTriangle className="w-4 h-4 text-warning" />} />
          <StatCard label="Today" value={stats.todayAttempts} icon={<Bell className="w-4 h-4 text-primary" />} />
          <StatCard label="Partner Attempts" value={stats.partnerAttempts} icon={<UserX className="w-4 h-4 text-destructive" />} />
          <StatCard label="Active Warnings" value={stats.activeWarnings} icon={<Ban className="w-4 h-4 text-destructive" />} />
        </div>

        <Tabs defaultValue="attempts">
          <TabsList>
            <TabsTrigger value="attempts">Bypass Attempts</TabsTrigger>
            <TabsTrigger value="warnings">Partner Warnings</TabsTrigger>
            <TabsTrigger value="chat-audit">Chat Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="attempts" className="space-y-3 mt-4">
            {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!loading && attempts.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No bypass attempts detected</CardContent></Card>
            )}
            {attempts.map((a) => (
              <Card key={a.id}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={a.actor_role === "partner" ? "destructive" : "secondary"} className="text-[10px]">
                        {a.actor_role}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{a.attempt_type}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    {a.detected_content && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Content: {a.detected_content}
                      </p>
                    )}
                    {a.booking_id && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Booking: {a.booking_id.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                  <Badge className="text-[10px]" variant="outline">{a.action_taken || "masked"}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="warnings" className="space-y-3 mt-4">
            {warnings.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No warnings issued</CardContent></Card>
            )}
            {warnings.map((w) => (
              <Card key={w.id}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <Ban className="w-4 h-4 text-destructive shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={w.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                        {w.severity}
                      </Badge>
                      <span className="text-xs font-medium">{w.warning_type.replace(/_/g, " ")}</span>
                    </div>
                    {w.description && <p className="text-xs text-muted-foreground mt-1">{w.description}</p>}
                  </div>
                  {w.resolved_at ? (
                    <Badge variant="outline" className="text-[10px] text-success">Resolved</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs h-7">Review</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="chat-audit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Flagged Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChatAuditList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ChatAuditList() {
  const [flagged, setFlagged] = useState<Array<{
    id: string;
    booking_id: string;
    sender_role: string;
    content: string;
    original_content: string | null;
    created_at: string;
  }>>([]);

  useEffect(() => {
    supabase
      .from("booking_messages")
      .select("id, booking_id, sender_role, content, original_content, created_at")
      .eq("was_masked", true)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setFlagged(data || []));
  }, []);

  if (flagged.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No flagged messages</p>;
  }

  return (
    <div className="space-y-2">
      {flagged.map((m) => (
        <div key={m.id} className="bg-muted/30 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{m.sender_role}</Badge>
            <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
            <Eye className="w-3 h-3 text-muted-foreground ml-auto" />
          </div>
          <p className="text-xs text-foreground">{m.content}</p>
          {m.original_content && (
            <p className="text-[10px] text-destructive/70 line-through">{m.original_content}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
