import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Wifi, Layers, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FleetAsset {
  id: string;
  asset_code: string;
  brand: string;
  model: string;
  asset_category: string;
  printer_type: string;
  copier_class: string | null;
  mono_or_colour: string;
  functions: string[];
  network_capable: boolean;
  duplex: boolean;
  max_paper_size: string;
  grade: string | null;
  cosmetic_grade: string | null;
  smartfix_certified: boolean;
  sps_eligible: boolean;
  serviceability_class: string;
  review_required: boolean;
  recommended_segment: string | null;
  monthly_duty_class: string | null;
  status: string;
}

const FLEET_GROUPS: { label: string; filter: (a: FleetAsset) => boolean }[] = [
  { label: "Mono Laser", filter: (a) => a.printer_type === "laser" && a.mono_or_colour === "mono" && a.asset_category === "Printer" },
  { label: "Mono Multifunction", filter: (a) => a.asset_category === "Multifunction Printer" && a.mono_or_colour === "mono" },
  { label: "Ink Tank", filter: (a) => a.printer_type === "ink_tank" },
  { label: "Cartridge Printers", filter: (a) => a.printer_type === "cartridge" },
  { label: "Colour Laser / MFP", filter: (a) => a.mono_or_colour === "colour" && a.printer_type === "laser" },
  { label: "Copier / Business Equipment", filter: (a) => ["Copier", "Copier / MFP", "Business Print Equipment"].includes(a.asset_category) },
];

const DUTY_LABELS: Record<string, string> = {
  light: "Up to 500 pages/mo",
  moderate: "500–1,500 pages/mo",
  heavy: "1,500+ pages/mo",
};

const SC_BADGE: Record<string, { label: string; cls: string }> = {
  "SPS Eligible": { label: "SPS Ready", cls: "bg-accent/10 text-accent" },
  "Resale Only": { label: "Resale Only", cls: "bg-muted text-muted-foreground" },
  "Donor Only": { label: "Donor Stock", cls: "bg-muted text-muted-foreground" },
  "Custom Quote Only": { label: "Custom Quote", cls: "bg-warning/10 text-warning" },
};

export default function SPSFleetPage() {
  const navigate = useNavigate();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["sps-fleet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sps_assets")
        .select("id, asset_code, brand, model, asset_category, printer_type, copier_class, mono_or_colour, functions, network_capable, duplex, max_paper_size, grade, cosmetic_grade, smartfix_certified, sps_eligible, serviceability_class, review_required, recommended_segment, monthly_duty_class, status")
        .in("status", ["available", "assigned", "reserved"])
        .order("asset_code");
      if (error) throw error;
      return (data || []) as FleetAsset[];
    },
  });

  const groupedAssets = FLEET_GROUPS.map((g) => ({
    ...g,
    items: assets.filter(g.filter),
  })).filter((g) => g.items.length > 0);

  // Catch-all for assets not in any group
  const groupedIds = new Set(groupedAssets.flatMap((g) => g.items.map((a) => a.id)));
  const ungrouped = assets.filter((a) => !groupedIds.has(a.id));
  if (ungrouped.length > 0) {
    groupedAssets.push({ label: "Other Devices", filter: () => true, items: ungrouped });
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/sps")} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold">SmartFix Certified Fleet</h1>
            <p className="text-xs text-muted-foreground">Professionally checked printers powering SPS plans</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mb-6">
          <span className="font-semibold text-foreground">Note:</span> SPS printers are assigned with plans, not purchased individually. Browse to understand the fleet quality behind your subscription.
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : groupedAssets.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Fleet data will be available soon.
          </div>
        ) : (
          groupedAssets.map((group) => (
            <div key={group.label} className="mb-8">
              <h2 className="font-heading text-base font-bold mb-3">{group.label}</h2>
              <div className="space-y-3">
                {group.items.map((asset) => {
                  const sc = SC_BADGE[asset.serviceability_class] || SC_BADGE["Custom Quote Only"];
                  return (
                    <Card key={asset.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm font-bold text-foreground">{asset.brand} {asset.model}</div>
                            <div className="text-xs text-muted-foreground">{asset.asset_category}{asset.copier_class ? ` · ${asset.copier_class}` : ""}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {asset.smartfix_certified && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                                <BadgeCheck className="w-3 h-3" /> Certified
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          {asset.recommended_segment && (
                            <div><span className="text-muted-foreground">Segment:</span> <span className="font-medium capitalize">{asset.recommended_segment.replace(/_/g, " ")}</span></div>
                          )}
                          <div><span className="text-muted-foreground">Duty:</span> <span className="font-medium">{DUTY_LABELS[asset.monthly_duty_class || "light"] || asset.monthly_duty_class}</span></div>
                          <div><span className="text-muted-foreground">Grade:</span> <span className="font-medium">{asset.grade || "—"}</span></div>
                          <div className="flex items-center gap-1">
                            {asset.network_capable && <Wifi className="w-3 h-3 text-primary" />}
                            {asset.duplex && <Layers className="w-3 h-3 text-primary" />}
                            <span className="text-muted-foreground ml-1 truncate">{(asset.functions || []).join(", ")}</span>
                          </div>
                          {asset.max_paper_size !== "A4" && (
                            <div><span className="text-muted-foreground">Paper:</span> <span className="font-medium">{asset.max_paper_size}</span></div>
                          )}
                        </div>
                        {asset.review_required && (
                          <div className="flex items-center gap-1.5 text-[10px] text-warning mb-2">
                            <AlertTriangle className="w-3 h-3" /> LankaFix Review Required
                          </div>
                        )}
                        {asset.sps_eligible && (
                          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => navigate("/sps/find-plan")}>
                            Request with Plan <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
