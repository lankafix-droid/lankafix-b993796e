import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Printer, FileText, Gauge, Headphones, Receipt, ArrowRight, BadgeCheck, Clock, AlertTriangle, Phone, MessageCircle, Camera, Upload, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function SPSDashboardPage() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const [contractsRes, requestsRes] = await Promise.all([
        supabase.from("sps_contracts" as any).select("*").eq("customer_id", user.id),
        supabase.from("sps_subscription_requests" as any).select("*").eq("customer_id", user.id).order("created_at", { ascending: false }),
      ]);

      setContracts((contractsRes.data as any[]) || []);
      setRequests((requestsRes.data as any[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeContract = contracts.find((c: any) => c.contract_status === "active");

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      submitted: "bg-primary/10 text-primary",
      under_review: "bg-warning/10 text-warning",
      approved: "bg-accent/10 text-accent",
      rejected: "bg-destructive/10 text-destructive",
      active: "bg-accent/10 text-accent",
      paused: "bg-warning/10 text-warning",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading your SPS dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-xs text-primary font-semibold mb-1">
            <Printer className="w-3.5 h-3.5" /> LankaFix SPS
          </div>
          <h1 className="font-heading text-xl font-bold">My Print Subscription</h1>
        </div>

        {/* Active Contract */}
        {activeContract ? (
          <Card className="mb-4 border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-primary">Active Plan</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(activeContract.contract_status)}`}>
                  {activeContract.contract_status}
                </span>
              </div>
              <div className="text-lg font-bold text-foreground mb-3">Subscription Active</div>
              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-muted-foreground">Start Date</div>
                  <div className="font-semibold">{activeContract.start_date || "—"}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-muted-foreground">Deposit Held</div>
                  <div className="font-semibold">Rs. {(activeContract.deposit_amount || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Gauge, label: "Submit Meter", action: () => navigate("/sps/meter") },
                  { icon: Headphones, label: "Get Support", action: () => navigate("/sps/support") },
                  { icon: Receipt, label: "Billing", action: () => navigate("/sps/billing") },
                  { icon: FileText, label: "Agreement", action: () => {} },
                ].map((a) => (
                  <button key={a.label} onClick={a.action} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 hover:border-primary/30 transition-all text-xs">
                    <a.icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{a.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* No Active Contract */
          <Card className="mb-4 bg-muted/30">
            <CardContent className="p-5 text-center">
              <Printer className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <div className="text-sm font-semibold text-foreground mb-1">No Active Subscription</div>
              <div className="text-xs text-muted-foreground mb-4">Start your smart print journey today</div>
              <Button onClick={() => navigate("/sps/find-plan")}>
                Find My Plan <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending Requests */}
        {requests.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground mb-3">Your Requests</h2>
            <div className="space-y-2">
              {requests.map((req: any) => (
                <Card key={req.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      req.request_status === "submitted" ? "bg-primary" :
                      req.request_status === "approved" ? "bg-accent" :
                      req.request_status === "rejected" ? "bg-destructive" : "bg-warning"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">Request #{req.id.slice(0, 8)}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusBadge(req.request_status)}`}>
                      {req.request_status.replace(/_/g, " ")}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="space-y-2 pb-8">
          {[
            { label: "Browse Plans", desc: "View all SPS plans", to: "/sps/plans" },
            { label: "Certified Fleet", desc: "SmartFix Certified printers", to: "/sps/fleet" },
            { label: "SPS Value Calculator", desc: "Compare SPS vs buying", to: "/sps" },
          ].map((link) => (
            <Card key={link.to} className="cursor-pointer hover:border-primary/30 transition-all" onClick={() => navigate(link.to)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">{link.label}</div>
                  <div className="text-[11px] text-muted-foreground">{link.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1">
              <Phone className="w-3.5 h-3.5" /> Callback
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
