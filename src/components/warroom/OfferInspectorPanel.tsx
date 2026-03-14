import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, Star, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Offer {
  id: string;
  partner_id: string;
  partner_name?: string;
  dispatch_score: number | null;
  offer_mode: string;
  is_lead_technician: boolean | null;
  status: string;
  created_at: string;
  expires_at: string;
  response_time_ms: number | null;
  estimated_distance_km: number | null;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
  dispatch_round: number;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    accepted: "bg-emerald-500/10 text-emerald-600",
    declined: "bg-destructive/10 text-destructive",
    expired: "bg-muted text-muted-foreground",
    expired_by_accept: "bg-muted text-muted-foreground",
    late_accept: "bg-orange-500/10 text-orange-600",
    superseded: "bg-muted text-muted-foreground",
  };
  return <Badge className={`${map[status] || "bg-muted"} text-[10px]`}>{status.replace(/_/g, " ")}</Badge>;
};

interface OfferInspectorPanelProps {
  bookingId: string | null;
}

export default function OfferInspectorPanel({ bookingId }: OfferInspectorPanelProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) { setOffers([]); return; }

    const load = async () => {
      setLoading(true);
      const { data: offersData } = await supabase
        .from("dispatch_offers")
        .select("id, partner_id, dispatch_score, offer_mode, is_lead_technician, status, created_at, expires_at, response_time_ms, estimated_distance_km, eta_min_minutes, eta_max_minutes, dispatch_round")
        .eq("booking_id", bookingId)
        .order("dispatch_round", { ascending: true })
        .order("dispatch_score", { ascending: false });

      if (offersData && offersData.length > 0) {
        const partnerIds = [...new Set(offersData.map(o => o.partner_id))];
        const { data: partners } = await supabase
          .from("partners")
          .select("id, full_name")
          .in("id", partnerIds);

        const pMap: Record<string, string> = {};
        partners?.forEach(p => { pMap[p.id] = p.full_name; });

        setOffers(offersData.map(o => ({ ...o, partner_name: pMap[o.partner_id] || o.partner_id.slice(0, 8) })));
      } else {
        setOffers([]);
      }
      setLoading(false);
    };

    load();

    const chan = supabase
      .channel(`offers-inspect-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_offers", filter: `booking_id=eq.${bookingId}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, [bookingId]);

  if (!bookingId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
          Select a booking to inspect offers
        </CardContent>
      </Card>
    );
  }

  // Race visualization
  const parallelOffers = offers.filter(o => o.offer_mode === "parallel");
  const winner = parallelOffers.find(o => o.status === "accepted");

  return (
    <Card className="h-full">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm">
          Offer Inspector · {bookingId.slice(0, 8)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {loading && <p className="text-xs text-muted-foreground p-4">Loading offers…</p>}

          {/* Parallel race summary */}
          {parallelOffers.length > 1 && (
            <div className="px-4 py-2 bg-primary/5 border-b">
              <p className="text-xs font-semibold flex items-center gap-1">
                <Zap size={12} className="text-primary" /> Parallel Race ({parallelOffers.length} offers)
              </p>
              {winner && (
                <p className="text-[10px] text-emerald-600 mt-0.5">
                  🏆 Winner: {winner.partner_name} ({winner.response_time_ms ? `${Math.round(winner.response_time_ms / 1000)}s` : "—"})
                </p>
              )}
            </div>
          )}

          <div className="divide-y">
            {offers.map(o => {
              const isExpired = new Date(o.expires_at).getTime() < Date.now() && o.status === "pending";
              const remainingSec = Math.max(0, Math.round((new Date(o.expires_at).getTime() - Date.now()) / 1000));

              return (
                <div key={o.id} className="px-4 py-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{o.partner_name}</span>
                      {o.is_lead_technician && (
                        <Badge className="bg-primary/10 text-primary text-[9px] px-1">LEAD</Badge>
                      )}
                      {winner?.id === o.id && <Trophy size={12} className="text-amber-500" />}
                    </div>
                    {statusBadge(o.status)}
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
                    <span className="flex items-center gap-0.5">
                      <Star size={10} /> {o.dispatch_score?.toFixed(0) ?? "—"}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} /> {o.estimated_distance_km?.toFixed(1) ?? "—"}km
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock size={10} />
                      {o.eta_min_minutes ?? "?"}-{o.eta_max_minutes ?? "?"}m
                    </span>
                    <span>R{o.dispatch_round}</span>
                  </div>

                  {o.status === "pending" && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={isExpired ? "text-destructive" : "text-amber-600"}>
                          {isExpired ? "⏰ EXPIRED" : `Expires in ${remainingSec}s`}
                        </span>
                      </div>
                      {!isExpired && (
                        <div className="w-full bg-muted h-1 rounded-full mt-0.5 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all"
                            style={{ width: `${Math.max(0, (remainingSec / 60) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {o.response_time_ms && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Response: {(o.response_time_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
