import { memo } from 'react';
import type { Campaign } from '@/types/campaign';
import CampaignCard from './CampaignCard';

interface CampaignContextRowsProps {
  campaigns: Campaign[];
  className?: string;
}

/** Horizontal scrolling rows of contextual campaign cards below the hero */
const CampaignContextRows = memo(({ campaigns, className }: CampaignContextRowsProps) => {
  if (campaigns.length === 0) return null;

  // Group campaigns by type for display sections
  const groups: { label: string; items: Campaign[] }[] = [];
  const recovery = campaigns.filter(c => c.campaign_type === 'user_recovery' || c.campaign_type === 'pending_quote');
  const business = campaigns.filter(c => c.campaign_type === 'sme_business');
  const trust = campaigns.filter(c => c.campaign_type === 'trust_reassurance' || c.campaign_type === 'warranty_assurance');
  const rest = campaigns.filter(c =>
    !recovery.includes(c) && !business.includes(c) && !trust.includes(c)
  );

  if (recovery.length > 0) groups.push({ label: 'Continue Your Action', items: recovery });
  if (rest.length > 0) groups.push({ label: 'Relevant to You', items: rest });
  if (business.length > 0) groups.push({ label: 'Business Solutions', items: business });
  if (trust.length > 0) groups.push({ label: 'Trust & Warranty', items: trust });

  return (
    <div className={className}>
      {groups.map(group => (
        <div key={group.label} className="py-3">
          <h3 className="px-4 pb-2 font-heading text-sm font-bold text-foreground">
            {group.label}
          </h3>
          {group.items.length === 1 ? (
            <div className="px-4">
              <CampaignCard campaign={group.items[0]} variant="mini" />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
              {group.items.map(c => (
                <CampaignCard key={c.id} campaign={c} variant="compact" />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

CampaignContextRows.displayName = 'CampaignContextRows';
export default CampaignContextRows;
