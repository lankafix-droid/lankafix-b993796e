import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gauge, Camera, Upload, Loader2, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SPSMeterPage() {
  const navigate = useNavigate();
  const [reading, setReading] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: contracts } = await supabase.from("sps_contracts" as any).select("*").eq("customer_id", user.id).eq("contract_status", "active").limit(1);
    if (contracts && (contracts as any[]).length > 0) {
      const c = (contracts as any[])[0];
      setContract(c);
      const { data: readings } = await supabase.from("sps_meter_readings" as any).select("*").eq("contract_id", c.id).order("submitted_at", { ascending: false });
      setHistory((readings as any[]) || []);
    }
  };

  const handleSubmit = async () => {
    if (!reading || !contract) return;
    const val = parseInt(reading);
    const lastVerified = history.find((r: any) => r.verification_status === "verified");
    if (lastVerified && val < lastVerified.reading_value) {
      toast({ title: "Reading cannot be lower than last verified reading", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("sps_meter_readings" as any).insert({
        contract_id: contract.id,
        asset_id: contract.asset_id,
        customer_id: user!.id,
        reading_value: val,
        notes: notes || null,
        verification_status: "pending",
      } as any);
      toast({ title: "Meter reading submitted", description: "Pending verification by our team." });
      setReading("");
      setNotes("");
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/sps/dashboard")} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold">Submit Meter Reading</h1>
            <p className="text-xs text-muted-foreground">Report your current page counter</p>
          </div>
        </div>

        {!contract ? (
          <Card className="bg-muted/30">
            <CardContent className="p-5 text-center">
              <Gauge className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">No active contract found</div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-4">
              <CardContent className="p-4 space-y-3">
                <div className="text-xs font-semibold text-foreground">Current Meter Reading</div>
                <Input
                  type="number"
                  placeholder="Enter page counter value"
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  className="text-lg font-bold"
                />
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Photo upload coming soon — enter manually for now
                </div>
                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button className="w-full" onClick={handleSubmit} disabled={!reading || submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Reading"}
                </Button>
              </CardContent>
            </Card>

            {history.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-foreground mb-3">Reading History</h2>
                <div className="space-y-2">
                  {history.map((r: any) => (
                    <Card key={r.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Gauge className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-bold text-foreground">{r.reading_value.toLocaleString()} pages</div>
                          <div className="text-[11px] text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString()}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          r.verification_status === "verified" ? "bg-accent/10 text-accent" :
                          r.verification_status === "disputed" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        }`}>
                          {r.verification_status}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
