import { memo } from 'react';
import { TrendingUp } from 'lucide-react';
import ContentSectionShell from './ContentSectionShell';
import ContentCard from './ContentCard';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

interface HotNowSectionProps {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const HotNowSection = memo(function HotNowSection({ onOpenItem }: HotNowSectionProps) {
  const { data: items, isLoading } = useContentIntelligence({
    surface: 'homepage_hot_now',
    limit: 8,
  });

  if (isLoading) {
    return (
      <section className="py-4">
        <div className="px-4 mb-2.5">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-3 px-4 overflow-hidden">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-24 w-[260px] shrink-0 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (!items?.length) return null;

  return (
    <ContentSectionShell
      title="Hot Now"
      icon={<TrendingUp className="h-4 w-4 text-warning" />}
      subtitle="What's happening in tech & services"
    >
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            variant="compact"
            onOpen={onOpenItem}
          />
        ))}
      </div>
    </ContentSectionShell>
  );
});

export default HotNowSection;
