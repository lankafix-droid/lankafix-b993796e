/**
 * OnboardingReviewPanel — Admin/Ops panel to review partner applications.
 * Shows pending/under_review partners with quick actions.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, User, MapPin, Wrench, FileCheck, Clock, ShieldCheck, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/30" },
  under_review: { label: "Under Review", className: "bg-accent/10 text-accent border-accent/30" },
  verified: { label: "Verified", className: "bg-success/10 text-success border-success/30" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/30" },
  suspended: { label: "Suspended", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function OnboardingReviewPanel() {
  const [filter, setFilter] = useState<string>("pending");

  const { data: partners = [], isLoading, refetch } = useQuery({
    queryKey: ["ops-partner-review", filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, full_name, business_name, phone_number, email, provider_type, categories_supported, service_zones, experience_years, verification_status, created_at, profile_photo_url")
        .eq("verification_status", filter as "pending" | "verified" | "suspended")
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = async (partnerId: string, newStatus: "pending" | "verified" | "suspended") => {
    const { error } = await supabase
      .from("partners")
      .update({ verification_status: newStatus })
      .eq("id", partnerId);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`Partner marked as ${newStatus}`);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Partner Applications</h2>
        <Badge variant="secondary" className="text-xs">{partners.length} results</Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["pending", "under_review", "verified", "rejected"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            className="text-xs rounded-full h-7 shrink-0"
            onClick={() => setFilter(s)}
          >
            {STATUS_BADGE[s]?.label || s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : partners.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {filter} applications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {partners.map((p: any) => {
            const badge = STATUS_BADGE[p.verification_status] || STATUS_BADGE.pending;
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {p.profile_photo_url ? (
                        <img src={p.profile_photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-foreground truncate">{p.full_name}</p>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </div>
                      {p.business_name && (
                        <p className="text-xs text-muted-foreground">{p.business_name}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {(p.categories_supported || []).length} categories
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {(p.service_zones || []).length} zones
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {p.experience_years || 0}y exp
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Applied {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {(p.verification_status === "pending" || p.verification_status === "under_review") && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
                      {p.verification_status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 flex-1"
                          onClick={() => updateStatus(p.id, "under_review")}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Start Review
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="text-xs h-7 flex-1"
                        onClick={() => updateStatus(p.id, "verified")}
                      >
                        <ShieldCheck className="w-3 h-3 mr-1" /> Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs h-7"
                        onClick={() => updateStatus(p.id, "rejected")}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
