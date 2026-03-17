/**
 * PartnerShortlistReviewPanel — Operator panel for reviewing partner candidates.
 * Advisory only — operator must manually choose. No auto-assignment.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Star, MapPin, Clock, Shield } from "lucide-react";

interface PartnerCandidate {
  id: string;
  name: string;
  rating: number | null;
  zone: string | null;
  responseTime: string | null;
  reason: string;
  recommended?: boolean;
}

interface Props {
  candidates: PartnerCandidate[];
  onSelect?: (partnerId: string) => void;
  loading?: boolean;
}

const PartnerShortlistReviewPanel = ({ candidates, onSelect, loading }: Props) => (
  <Card>
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Partner Shortlist</h3>
        </div>
        <Badge variant="outline" className="text-[9px]">Manual Selection Required</Badge>
      </div>

      <p className="text-[10px] text-muted-foreground">
        These partners were suggested based on availability, proximity, and ratings.
        <strong className="text-foreground"> You decide who to assign.</strong>
      </p>

      {candidates.length === 0 ? (
        <div className="bg-muted/40 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">
            {loading ? "Finding available partners..." : "No matching partners found in this zone."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-3 flex items-center gap-3 ${
                c.recommended ? "border-primary/30 bg-primary/5" : "border-border/40"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground">{c.name}</p>
                  {c.recommended && <Badge className="bg-primary/10 text-primary border-0 text-[8px]">Recommended</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  {c.rating && (
                    <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />{c.rating.toFixed(1)}</span>
                  )}
                  {c.zone && (
                    <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{c.zone}</span>
                  )}
                  {c.responseTime && (
                    <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{c.responseTime}</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 italic">{c.reason}</p>
              </div>
              {onSelect && (
                <Button size="sm" variant="outline" className="text-[10px] h-7 px-2.5" onClick={() => onSelect(c.id)}>
                  Assign
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-2.5">
        <Shield className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground">
          Assignment is manual. AI suggestions are advisory only — final decision is yours.
        </p>
      </div>
    </CardContent>
  </Card>
);

export default PartnerShortlistReviewPanel;
