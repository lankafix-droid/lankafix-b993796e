/**
 * SafetyAlertsSection v5 — Urgent, premium safety surface with distinct alert styling.
 * Feels protective, urgent, trustworthy without looking tabloid.
 */
import { memo } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import ContentSectionShell from './ContentSectionShell';
import ContentCard from './ContentCard';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const SafetyAlertsSection = memo(function SafetyAlertsSection({ onOpenItem }: Props) {
  const { data: items, isLoading } = useContentIntelligence({
    surface: 'homepage_safety',
    limit: 3,
  });

  if (isLoading) return null;
  if (!items?.length) return null;

  return (
    <ContentSectionShell
      title="Safety & Alerts"
      icon={<Shield className="h-4 w-4 text-destructive" />}
      subtitle="Stay protected, stay informed"
      premium
    >
      {/* Urgent safety banner */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/15 bg-destructive/[0.03] px-3.5 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/15">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive/70" />
          </div>
          <div>
            <p className="text-[11px] text-destructive/80 font-semibold leading-tight">
              {items.length} active alert{items.length !== 1 ? 's' : ''} — review for your safety
            </p>
            <p className="text-[10px] text-destructive/50 mt-0.5">
              LankaFix monitors threats to keep you protected
            </p>
          </div>
        </div>
      </div>
      <div className="px-4 space-y-2.5">
        {items.slice(0, 1).map((item) => (
          <ContentCard key={item.id} item={item} variant="hero" onOpen={onOpenItem} />
        ))}
        {items.slice(1).map((item) => (
          <ContentCard key={item.id} item={item} variant="standard" onOpen={onOpenItem} />
        ))}
      </div>
    </ContentSectionShell>
  );
});

export default SafetyAlertsSection;
