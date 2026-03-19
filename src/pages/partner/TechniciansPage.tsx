/**
 * Partner Fleet Management — DB-backed technician list for the current partner.
 * Replaces all MOCK_PARTNERS/MOCK_TECHNICIANS with real Supabase queries.
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentPartner } from "@/hooks/useCurrentPartner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { ArrowLeft, User, MapPin, Star, Users, Loader2 } from "lucide-react";

export default function TechniciansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: partner, isLoading: partnerLoading } = useCurrentPartner();

  // For the pilot, partner = technician (same entity). 
  // Query bookings assigned to this partner for job count stats.
  const { data: jobStats } = useQuery({
    queryKey: ["partner-job-stats", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return { active: 0, completed: 0 };
      const { count: active } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partner.id)
        .in("status", ["assigned", "tech_en_route", "arrived", "inspection_started", "repair_in_progress"]);
      const { count: completed } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partner.id)
        .eq("status", "completed");
      return { active: active || 0, completed: completed || 0 };
    },
    enabled: !!partner?.id,
  });

  const toggleAvailability = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!partner?.id) throw new Error("No partner");
      const { error } = await supabase
        .from("partners")
        .update({ availability_status: newStatus } as any)
        .eq("id", partner.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["current-partner"] }),
  });

  useEffect(() => { track("partner_technicians_view"); }, []);

  if (partnerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background p-4">
        <EmptyState icon={Users} title="No partner record" description="Your account is not linked to a partner company." />
      </div>
    );
  }

  const availStatus = (partner as any).availability_status || "available";

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Fleet Management</h1>
          <p className="text-xs text-muted-foreground">{partner.full_name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 pb-0">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{jobStats?.active || 0}</p>
            <p className="text-[9px] text-muted-foreground">Active Jobs</p>
          </div>
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-success">{jobStats?.completed || 0}</p>
            <p className="text-[9px] text-muted-foreground">Completed</p>
          </div>
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{partner.rating_average || "–"}</p>
            <p className="text-[9px] text-muted-foreground">Rating</p>
          </div>
        </div>
      </div>

      {/* Partner / Self card (pilot: partner = technician) */}
      <div className="p-4 pt-0 space-y-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-foreground">{partner.full_name}</p>
                  <Badge variant="outline" className={`text-[10px] ${
                    availStatus === "available" ? "bg-success/10 text-success border-success/20" :
                    availStatus === "busy" ? "bg-warning/10 text-warning border-warning/20" :
                    "bg-muted text-muted-foreground border-muted"
                  }`}>
                    {availStatus}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {partner.rating_average && (
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3" /> {partner.rating_average}</span>
                  )}
                  {partner.service_zones?.[0] && (
                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {partner.service_zones[0]}</span>
                  )}
                </div>

                {/* Availability toggles */}
                <div className="flex gap-1.5 mt-3">
                  {["available", "busy", "offline"].map((status) => (
                    <Button key={status} size="sm" className="text-[10px] h-7 px-2"
                      variant={availStatus === status ? "default" : "outline"}
                      disabled={toggleAvailability.isPending}
                      onClick={() => toggleAvailability.mutate(status)}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          In the pilot, each partner operates as their own technician. Multi-technician fleet management will be available in a future update.
        </p>
      </div>
    </div>
  );
}
