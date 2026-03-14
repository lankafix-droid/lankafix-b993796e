import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, UserCheck, UserX, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MULTI_TECH_DEFAULTS: Record<string, number> = { AC: 2, SOLAR: 3, CCTV: 2, SMART_HOME_OFFICE: 2 };

interface TeamMember {
  partner_id: string;
  name: string;
  is_lead: boolean;
  status: string;
}

interface MultiTechTeamPanelProps {
  bookingId: string | null;
  categoryCode: string;
}

export default function MultiTechTeamPanel({ bookingId, categoryCode }: MultiTechTeamPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const required = MULTI_TECH_DEFAULTS[categoryCode] || 2;

  useEffect(() => {
    if (!bookingId) { setMembers([]); return; }

    const load = async () => {
      const { data: offers } = await supabase
        .from("dispatch_offers")
        .select("partner_id, is_lead_technician, status")
        .eq("booking_id", bookingId)
        .eq("offer_mode", "multi_tech");

      if (!offers || offers.length === 0) { setMembers([]); return; }

      const ids = [...new Set(offers.map(o => o.partner_id))];
      const { data: partners } = await supabase
        .from("partners")
        .select("id, full_name")
        .in("id", ids);

      const pMap: Record<string, string> = {};
      partners?.forEach(p => { pMap[p.id] = p.full_name; });

      setMembers(offers.map(o => ({
        partner_id: o.partner_id,
        name: pMap[o.partner_id] || o.partner_id.slice(0, 8),
        is_lead: o.is_lead_technician || false,
        status: o.status,
      })));
    };

    load();
  }, [bookingId]);

  const accepted = members.filter(m => m.status === "accepted");
  const pending = members.filter(m => m.status === "pending");
  const progress = (accepted.length / required) * 100;

  if (!bookingId || members.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users size={14} /> Team Formation
          <Badge variant="outline" className="text-[10px] ml-auto">
            {accepted.length}/{required}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <Progress value={progress} className="h-2" />

        <div className="space-y-1.5">
          {members.map(m => (
            <div key={m.partner_id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {m.is_lead && <Crown size={12} className="text-amber-500" />}
                <span className={m.status === "accepted" ? "font-semibold" : "text-muted-foreground"}>
                  {m.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {m.is_lead && <Badge className="bg-primary/10 text-primary text-[9px] px-1">LEAD</Badge>}
                {m.status === "accepted" ? (
                  <UserCheck size={14} className="text-emerald-600" />
                ) : m.status === "pending" ? (
                  <span className="text-amber-600 text-[10px]">waiting…</span>
                ) : (
                  <UserX size={14} className="text-destructive" />
                )}
              </div>
            </div>
          ))}
        </div>

        {accepted.length < required && pending.length === 0 && (
          <p className="text-[10px] text-destructive">
            ⚠ Team incomplete — no pending offers remaining
          </p>
        )}
      </CardContent>
    </Card>
  );
}
