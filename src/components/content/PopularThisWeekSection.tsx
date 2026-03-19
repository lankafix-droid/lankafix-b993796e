import { memo } from 'react';
import { TrendingUp } from 'lucide-react';
import ContentSectionShell from './ContentSectionShell';
import ContentCard from './ContentCard';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const PopularThisWeekSection = memo(function PopularThisWeekSection({ onOpenItem }: Props) {
  const { data: items, isLoading } = useContentIntelligence({
    surface: 'homepage_popular',
    limit: 5,
  });

  if (isLoading || !items?.length) return null;

  return (
    <ContentSectionShell
      title="Popular This Week"
      icon={<TrendingUp className="h-4 w-4 text-accent" />}
      subtitle="Most read by LankaFix users"
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

export default PopularThisWeekSection;
