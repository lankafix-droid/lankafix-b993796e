/**
 * Operator Pilot Execution Board — Actionable items for pilot operations.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Clock, MessageSquare, DollarSign, Phone, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActionItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  priority: "high" | "medium" | "low";
  icon: React.ReactNode;
}

async function fetchExecutionItems(): Promise<ActionItem[]> {
  const items: ActionItem[] = [];

  // Bookings needing manual dispatch (requested > 10 min)
  const staleThreshold = new Date(Date.now() - 10 * 60000).toISOString();
  const { data: stale } = await supabase
    .from("bookings")
    .select("id, category_code, created_at")
    .eq("status", "requested")
    .lt("created_at", staleThreshold)
    .limit(20);

  (stale || []).forEach((b: any) => {
    items.push({
      id: `dispatch-${b.id}`, type: "dispatch",
      title: `Manual dispatch needed: ${b.category_code}`,
      subtitle: `Created ${new Date(b.created_at).toLocaleString()}`,
      priority: "high",
      icon: <AlertTriangle className="w-4 h-4 text-warning" />,
    });
  });

  // Bookings waiting for quote (assigned but no price)
  const { data: noQuote } = await supabase
    .from("bookings")
    .select("id, category_code, partner_id")
    .eq("status", "assigned")
    .is("estimated_price_lkr", null)
    .limit(20);

  (noQuote || []).forEach((b: any) => {
    items.push({
      id: `quote-${b.id}`, type: "quote",
      title: `Waiting for quote: ${b.category_code}`,
      subtitle: `Partner assigned, no quote yet`,
      priority: "medium",
      icon: <Wrench className="w-4 h-4 text-primary" />,
    });
  });

  // Overdue callbacks
  const { data: callbacks } = await supabase
    .from("operator_callback_tasks")
    .select("id, title, priority, due_at")
    .eq("status", "pending")
    .order("due_at", { ascending: true })
    .limit(20);

  (callbacks || []).forEach((c: any) => {
    const overdue = c.due_at && new Date(c.due_at) < new Date();
    items.push({
      id: `callback-${c.id}`, type: "callback",
      title: c.title,
      subtitle: overdue ? "OVERDUE" : `Due: ${c.due_at ? new Date(c.due_at).toLocaleString() : "No date"}`,
      priority: overdue ? "high" : "medium",
      icon: <Phone className="w-4 h-4 text-accent" />,
    });
  });

  // Open support cases
  const { data: support } = await supabase
    .from("support_cases" as any)
    .select("id, issue_type, priority, status")
    .eq("status", "open")
    .limit(20);

  (support || []).forEach((s: any) => {
    items.push({
      id: `support-${s.id}`, type: "support",
      title: `Support: ${s.issue_type}`,
      subtitle: `Priority: ${s.priority}`,
      priority: s.priority === "high" ? "high" : "medium",
      icon: <MessageSquare className="w-4 h-4 text-destructive" />,
    });
  });

  // Payment follow-up (completed but unpaid)
  const { data: unpaid } = await supabase
    .from("bookings")
    .select("id, category_code")
    .eq("status", "completed")
    .eq("payment_status", "pending")
    .limit(20);

  (unpaid || []).forEach((b: any) => {
    items.push({
      id: `payment-${b.id}`, type: "payment",
      title: `Payment pending: ${b.category_code}`,
      subtitle: "Job completed, no payment recorded",
      priority: "medium",
      icon: <DollarSign className="w-4 h-4 text-warning" />,
    });
  });

  // Sort by priority
  const order = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => order[a.priority] - order[b.priority]);
}

export default function OperatorExecutionBoardPage() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useQuery({
    queryKey: ["operator-execution-board"],
    queryFn: fetchExecutionItems,
    refetchInterval: 30_000,
  });

  const high = items?.filter(i => i.priority === "high").length ?? 0;
  const medium = items?.filter(i => i.priority === "medium").length ?? 0;

  return (
    <div className="min-h-screen bg-background safe-area-top">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/launch-command-center-v2")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-heading">Operator Execution Board</h1>
            <p className="text-xs text-muted-foreground">Live action items for pilot operations</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <span className="text-2xl font-bold text-destructive">{high}</span>
              <p className="text-[10px] text-muted-foreground">High Priority</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <span className="text-2xl font-bold text-warning">{medium}</span>
              <p className="text-[10px] text-muted-foreground">Medium</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <span className="text-2xl font-bold">{items?.length ?? 0}</span>
              <p className="text-[10px] text-muted-foreground">Total Items</p>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Action Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading…</p>
            ) : !items?.length ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No action items. All clear!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2.5 px-3 border border-border/40 rounded-lg">
                    {item.icon}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <Badge variant={item.priority === "high" ? "destructive" : "outline"} className="text-[10px] shrink-0">
                      {item.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
