import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Headphones, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SPS_SUPPORT_CATEGORIES } from "@/types/sps";

export default function SPSSupportPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("sps_support_tickets" as any).select("*").eq("customer_id", user.id).order("opened_at", { ascending: false });
    setTickets((data as any[]) || []);
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      await supabase.from("sps_support_tickets" as any).insert({
        customer_id: user.id,
        category,
        issue_description: description,
        priority: "normal",
        status: "open",
      } as any);
      toast({ title: "Support ticket created", description: "Our team will respond shortly." });
      setDescription("");
      loadTickets();
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
          <h1 className="font-heading text-lg font-bold">SPS Support</h1>
        </div>

        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <div className="text-xs font-semibold text-foreground">New Support Request</div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Issue Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {SPS_SUPPORT_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Describe the issue</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="What's happening with your printer?"
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={!description.trim() || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Ticket"}
            </Button>
          </CardContent>
        </Card>

        {tickets.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">Your Tickets</h2>
            <div className="space-y-2">
              {tickets.map((t: any) => (
                <Card key={t.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground capitalize">{t.category.replace(/_/g, " ")}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        t.status === "resolved" || t.status === "closed" ? "bg-accent/10 text-accent" :
                        t.status === "open" ? "bg-primary/10 text-primary" :
                        "bg-warning/10 text-warning"
                      }`}>{t.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{t.issue_description}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(t.opened_at).toLocaleDateString()}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
