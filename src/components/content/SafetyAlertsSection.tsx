import { memo } from 'react';
import { Shield } from 'lucide-react';
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

  if (isLoading) return null; // Don't show skeleton for safety — only show when relevant

  if (!items?.length) return null;

  return (
    <ContentSectionShell
      title="Safety & Alerts"
      icon={<Shield className="h-4 w-4 text-destructive" />}
      subtitle="Stay protected, stay informed"
    >
      <div className="px-4 space-y-2">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            variant="standard"
            onOpen={onOpenItem}
          />
        ))}
      </div>
    </ContentSectionShell>
  );
});

export default SafetyAlertsSection;
