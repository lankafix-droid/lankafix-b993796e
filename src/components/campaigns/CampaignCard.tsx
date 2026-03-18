import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ArrowRight, Shield, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign, TrustBadge } from '@/types/campaign';
import { TRUST_BADGE_LABELS } from '@/config/seededCampaigns';
import { trackCampaignEvent, dismissCampaign } from '@/lib/campaignAnalytics';

// ─── Gradient map by campaign type ───────────────────────────────
const TYPE_GRADIENTS: Record<string, string> = {
  hero_promotion: 'from-primary to-[hsl(var(--lankafix-green))]',
  trust_reassurance: 'from-[hsl(211,60%,40%)] to-primary',
  seasonal_demand: 'from-[hsl(30,80%,48%)] to-[hsl(15,75%,50%)]',
  user_recovery: 'from-[hsl(var(--lankafix-green))] to-[hsl(160,50%,38%)]',
  pending_quote: 'from-primary to-[hsl(230,55%,48%)]',
  education_info: 'from-[hsl(200,65%,42%)] to-primary',
  nearby_technicians: 'from-[hsl(var(--lankafix-green))] to-primary',
  sme_business: 'from-[hsl(220,60%,32%)] to-[hsl(235,50%,42%)]',
  warranty_assurance: 'from-primary to-[hsl(var(--lankafix-green))]',
  subscription_amc: 'from-[hsl(265,45%,42%)] to-primary',
  partner_spotlight: 'from-[hsl(var(--lankafix-green))] to-[hsl(160,55%,32%)]',
  emergency_alert: 'from-destructive to-[hsl(15,75%,48%)]',
};

const TYPE_ICONS: Record<string, typeof Shield> = {
  trust_reassurance: Shield,
  warranty_assurance: Shield,
  emergency_alert: Zap,
};

// ─── Trust Badge Pill ────────────────────────────────────────────
export const TrustBadgePill = memo(({ badge }: { badge: TrustBadge }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-medium text-primary-foreground backdrop-blur-sm">
    <BadgeCheck className="h-3 w-3" />
    {TRUST_BADGE_LABELS[badge]}
  </span>
));
TrustBadgePill.displayName = 'TrustBadgePill';

// ─── Campaign Card ───────────────────────────────────────────────
interface CampaignCardProps {
  campaign: Campaign;
  variant?: 'hero' | 'compact' | 'mini';
  dismissible?: boolean;
  onDismiss?: (id: string) => void;
  className?: string;
}

const CampaignCard = memo(({ campaign, variant = 'hero', dismissible, onDismiss, className }: CampaignCardProps) => {
  const navigate = useNavigate();
  const gradient = TYPE_GRADIENTS[campaign.campaign_type] || TYPE_GRADIENTS.hero_promotion;
  const Icon = TYPE_ICONS[campaign.campaign_type];

  const handleClick = useCallback(() => {
    trackCampaignEvent(campaign.id, 'card_click', {
      campaign_type: campaign.campaign_type,
      cta_deep_link: campaign.cta_deep_link,
    });
    if (campaign.cta_deep_link) navigate(campaign.cta_deep_link);
  }, [campaign, navigate]);

  const handleCTA = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    trackCampaignEvent(campaign.id, 'cta_click', {
      campaign_type: campaign.campaign_type,
      cta_label: campaign.cta_label,
    });
    if (campaign.cta_deep_link) navigate(campaign.cta_deep_link);
  }, [campaign, navigate]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dismissCampaign(campaign.id);
    onDismiss?.(campaign.id);
  }, [campaign.id, onDismiss]);

  // ─── Mini Variant ──────────────────────────────────────────────
  if (variant === 'mini') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-3 rounded-xl bg-gradient-to-r p-3 text-left text-primary-foreground transition-transform active:scale-[0.98]',
          gradient, className,
        )}
      >
        {Icon && <Icon className="h-5 w-5 shrink-0 opacity-80" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{campaign.title}</p>
          {campaign.subtitle && (
            <p className="truncate text-[10px] opacity-80">{campaign.subtitle}</p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
      </button>
    );
  }

  // ─── Compact Variant ───────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'relative flex flex-col gap-2 rounded-2xl bg-gradient-to-br p-4 text-left text-primary-foreground shadow-md transition-all active:scale-[0.98]',
          gradient, 'min-w-[200px] max-w-[220px] shrink-0', className,
        )}
      >
        {dismissible && (
          <button onClick={handleDismiss} className="absolute right-2 top-2 rounded-full bg-background/20 p-1 backdrop-blur-sm" aria-label="Dismiss">
            <X className="h-3 w-3" />
          </button>
        )}
        {campaign.urgency_tag && (
          <span className="self-start rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
            {campaign.urgency_tag}
          </span>
        )}
        <p className="text-sm font-bold leading-tight">{campaign.title}</p>
        {campaign.subtitle && (
          <p className="text-xs leading-snug opacity-85">{campaign.subtitle}</p>
        )}
        {campaign.trust_badges.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {campaign.trust_badges.slice(0, 2).map(b => (
              <TrustBadgePill key={b} badge={b} />
            ))}
          </div>
        )}
        {campaign.cta_label && (
          <span className="mt-auto inline-flex items-center gap-1 self-start rounded-full bg-background/25 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {campaign.cta_label}
            <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </button>
    );
  }

  // ─── Hero Variant (default) ────────────────────────────────────
  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative flex w-full flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-left text-primary-foreground shadow-lg transition-all active:scale-[0.99]',
        gradient, 'min-h-[168px]', className,
      )}
    >
      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

      {/* Urgency tag */}
      {campaign.urgency_tag && (
        <span className="absolute right-4 top-4 z-10 rounded-full bg-background/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
          {campaign.urgency_tag}
        </span>
      )}

      <div className="relative z-10 flex flex-col gap-2">
        {Icon && <Icon className="h-6 w-6 opacity-80" />}
        <h3 className="font-heading text-lg font-bold leading-tight">{campaign.title}</h3>
        {campaign.subtitle && (
          <p className="text-sm leading-snug opacity-90">{campaign.subtitle}</p>
        )}
        {campaign.trust_badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {campaign.trust_badges.slice(0, 3).map(b => (
              <TrustBadgePill key={b} badge={b} />
            ))}
          </div>
        )}
        {campaign.cta_label && (
          <button
            onClick={handleCTA}
            className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-background/25 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-background/35"
          >
            {campaign.cta_label}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </button>
  );
});

CampaignCard.displayName = 'CampaignCard';
export default CampaignCard;
