/**
 * PartnerShortlistReviewPanel — Operator panel for reviewing partner candidates.
 * Advisory only — operator must manually choose. No auto-assignment.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Star, MapPin, Clock, Shield, CheckCircle2, AlertTriangle, Briefcase } from "lucide-react";

export interface PartnerCandidate {
  id: string;
  name: string;
  rating: number | null;
  zone: string | null;
  responseTime: string | null;
  reason: string;
  recommended?: boolean;
  categoryMatch?: boolean;
  zoneMatch?: boolean;
  availability?: "available" | "busy" | "offline";
  completedJobs?: number | null;
  cautionNotes?: string[];
}

interface Props {
  candidates: PartnerCandidate[];
  onSelect?: (partnerId: string) => void;
  loading?: boolean;
  bookingCategory?: string;
  bookingZone?: string;
}

function CautionNote({ note }: { note: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] text-amber-700 bg-amber-500/10 rounded px-1.5 py-0.5">
      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
      {note}
    </span>
  );
}

const AVAILABILITY_DISPLAY: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-500/10 text-green-700" },
  busy: { label: "Busy", color: "bg-amber-500/10 text-amber-700" },
  offline: { label: "Offline", color: "bg-muted text-muted-foreground" },
};

const PartnerShortlistReviewPanel = ({ candidates, onSelect, loading, bookingCategory, bookingZone }: Props) => (
  <Card className="border-primary/10">
    <CardContent className="p-4 space-y-3">
      {/* Header */}
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

      {/* Context badges */}
      {(bookingCategory || bookingZone) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {bookingCategory && (
            <Badge variant="secondary" className="text-[9px]">Category: {bookingCategory}</Badge>
          )}
          {bookingZone && (
            <Badge variant="secondary" className="text-[9px]">Zone: {bookingZone}</Badge>
          )}
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="bg-muted/40 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">
            {loading ? "Finding available partners..." : "No matching partners found in this zone."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {candidates.map((c) => {
            const avail = c.availability ? AVAILABILITY_DISPLAY[c.availability] : null;
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-3.5 space-y-2 transition-colors ${
                  c.recommended ? "border-primary/30 bg-primary/5" : "border-border/40 hover:border-border/60"
                }`}
              >
                {/* Row 1: Name + badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    {c.recommended && (
                      <Badge className="bg-primary/10 text-primary border-0 text-[8px] shrink-0">Recommended</Badge>
                    )}
                  </div>
                  {avail && (
                    <Badge variant="outline" className={`text-[8px] border-0 shrink-0 ${avail.color}`}>
                      {avail.label}
                    </Badge>
                  )}
                </div>

                {/* Row 2: Key metrics */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                  {c.rating != null && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-500" />{c.rating.toFixed(1)}
                    </span>
                  )}
                  {c.zone && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{c.zone}
                      {c.zoneMatch && <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />}
                    </span>
                  )}
                  {c.responseTime && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />{c.responseTime}
                    </span>
                  )}
                  {c.completedJobs != null && (
                    <span className="flex items-center gap-0.5">
                      <Briefcase className="w-2.5 h-2.5" />{c.completedJobs} jobs
                    </span>
                  )}
                  {c.categoryMatch && (
                    <Badge variant="outline" className="text-[8px] border-0 bg-green-500/10 text-green-700">
                      Category ✓
                    </Badge>
                  )}
                </div>

                {/* Row 3: Reason */}
                <p className="text-[10px] text-muted-foreground italic">{c.reason}</p>

                {/* Row 4: Caution notes */}
                {c.cautionNotes && c.cautionNotes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.cautionNotes.map((note, i) => (
                      <CautionNote key={i} note={note} />
                    ))}
                  </div>
                )}

                {/* Row 5: Action */}
                {onSelect && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-[10px] h-7 mt-1"
                    onClick={() => onSelect(c.id)}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Select This Partner
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decision checkpoint */}
      <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-foreground">Manual review required</p>
            <p className="text-[10px] text-muted-foreground">
              AI suggestions are informational only. Final assignment is made by LankaFix operator.
              Customer approval is required before work begins.
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default PartnerShortlistReviewPanel;
