import { memo, useState, useCallback } from 'react';
import type { Campaign, RankedCampaigns } from '@/types/campaign';
import CampaignCard from './CampaignCard';

interface CampaignContextRowsProps {
  ranked: RankedCampaigns;
  className?: string;
}

interface RowConfig {
  label: string;
  items: Campaign[];
  variant: 'compact' | 'mini';
  dismissible?: boolean;
}

/** Modular below-hero campaign rows, driven by slot-allocated data */
const CampaignContextRows = memo(({ ranked, className }: CampaignContextRowsProps) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback((id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  }, []);

  const filterDismissed = (items: Campaign[]) =>
    items.filter(c => !dismissed.has(c.id));

  const rows: RowConfig[] = [
    { label: 'Continue Your Action', items: filterDismissed(ranked.recovery), variant: 'mini', dismissible: true },
    { label: 'Trending in Your Area', items: filterDismissed(ranked.trending), variant: 'compact' },
    { label: 'Verified Nearby Services', items: filterDismissed(ranked.nearby), variant: 'compact' },
    { label: 'Business Solutions', items: filterDismissed(ranked.business), variant: 'compact' },
    { label: 'Trust & Warranty', items: filterDismissed(ranked.trust), variant: 'mini' },
    { label: 'Tips & Guides', items: filterDismissed(ranked.education), variant: 'compact' },
  ].filter(r => r.items.length > 0);

  if (rows.length === 0) return null;

  return (
    <div className={className}>
      {rows.map(row => (
        <div key={row.label} className="py-3">
          <h3 className="px-4 pb-2 font-heading text-sm font-bold text-foreground">
            {row.label}
          </h3>
          {row.items.length === 1 && row.variant === 'mini' ? (
            <div className="px-4">
              <CampaignCard
                campaign={row.items[0]}
                variant="mini"
                dismissible={row.dismissible}
                onDismiss={handleDismiss}
              />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
              {row.items.map(c => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  variant={row.variant}
                  dismissible={row.dismissible}
                  onDismiss={handleDismiss}
                />
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
