/**
 * MaskedProviderCard — Shows provider info with masked identity before confirmation.
 * Reveals full details only after protection payment + acceptance.
 */
import { Star, MapPin, ShieldCheck, Lock, Clock, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { maskProviderName, isContactRevealAllowed } from "@/engines/antiBypassEngine";

interface MaskedProviderCardProps {
  provider: {
    full_name: string;
    business_name?: string | null;
    rating_average?: number | null;
    completed_jobs_count?: number | null;
    specializations?: string[] | null;
    vehicle_type?: string | null;
    profile_photo_url?: string | null;
    phone_number?: string;
  };
  protectionStatus: string | null;
  dispatchStatus: string | null;
  etaRange?: string;
  approximateArea?: string;
  className?: string;
}

export default function MaskedProviderCard({
  provider,
  protectionStatus,
  dispatchStatus,
  etaRange,
  approximateArea,
  className = "",
}: MaskedProviderCardProps) {
  const unlocked = isContactRevealAllowed(protectionStatus, dispatchStatus);
  const displayName = unlocked ? provider.full_name : maskProviderName(provider.full_name);

  return (
    <div className={`bg-card border border-border rounded-xl p-4 space-y-3 ${className}`}>
      {/* Identity row */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {unlocked && provider.profile_photo_url ? (
            <img src={provider.profile_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Wrench className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
            {unlocked && (
              <Badge className="bg-success/10 text-success text-[9px] px-1.5 py-0">
                <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
              </Badge>
            )}
          </div>
          {unlocked && provider.business_name && (
            <p className="text-xs text-muted-foreground truncate">{provider.business_name}</p>
          )}
          {!unlocked && (
            <p className="text-[11px] text-muted-foreground">Identity revealed after confirmation</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {provider.rating_average != null && provider.rating_average > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
            <span className="font-medium text-foreground">{provider.rating_average.toFixed(1)}</span>
          </div>
        )}
        {provider.completed_jobs_count != null && (
          <span>{provider.completed_jobs_count} jobs</span>
        )}
        {etaRange && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{etaRange}</span>
          </div>
        )}
      </div>

      {/* Specializations */}
      {provider.specializations && provider.specializations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {provider.specializations.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] font-normal">
              {s.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      {/* Approximate location */}
      {approximateArea && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>{unlocked ? approximateArea : `Near ${approximateArea}`}</span>
        </div>
      )}

      {/* Contact locked notice */}
      {!unlocked && (
        <div className="bg-muted/50 border border-dashed border-border rounded-lg p-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Phone number and exact location are shared after booking confirmation to protect both customer and provider.
          </p>
        </div>
      )}
    </div>
  );
}
