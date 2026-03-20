import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function SPSBillingPage() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<any[]>([]);

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: contracts } = await supabase.from("sps_contracts" as any).select("id").eq("customer_id", user.id);
    if (contracts && (contracts as any[]).length > 0) {
      const ids = (contracts as any[]).map((c: any) => c.id);
      const { data } = await supabase.from("sps_billing_cycles" as any).select("*").in("contract_id", ids).order("billing_month", { ascending: false });
      setCycles((data as any[]) || []);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/sps/dashboard")} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading text-lg font-bold">Billing & Invoices</h1>
        </div>

        {cycles.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-5 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">No billing cycles yet</div>
              <div className="text-xs text-muted-foreground mt-1">Billing will appear once your subscription is active</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cycles.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-foreground">{c.billing_month}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      c.billing_status === "paid" ? "bg-accent/10 text-accent" :
                      c.billing_status === "overdue" ? "bg-destructive/10 text-destructive" :
                      "bg-warning/10 text-warning"
                    }`}>{c.billing_status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Base Fee</span><div className="font-semibold">Rs. {c.base_fee.toLocaleString()}</div></div>
                    <div><span className="text-muted-foreground">Pages Used</span><div className="font-semibold">{c.actual_pages}</div></div>
                    <div><span className="text-muted-foreground">Total Due</span><div className="font-bold text-primary">Rs. {c.total_due.toLocaleString()}</div></div>
                  </div>
                  {c.overage_pages > 0 && (
                    <div className="text-[11px] text-warning mt-2">+{c.overage_pages} overage pages (Rs. {c.overage_amount.toLocaleString()})</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
