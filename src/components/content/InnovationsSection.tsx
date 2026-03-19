import { memo } from 'react';
import { Zap } from 'lucide-react';
import ContentSectionShell from './ContentSectionShell';
import ContentCard from './ContentCard';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const InnovationsSection = memo(function InnovationsSection({ onOpenItem }: Props) {
  const { data: items, isLoading } = useContentIntelligence({
    surface: 'homepage_innovations',
    limit: 4,
  });

  if (isLoading) {
    return (
      <section className="py-4 px-4">
        <div className="h-5 w-32 animate-pulse rounded bg-muted mb-2.5" />
        <div className="h-44 animate-pulse rounded-2xl bg-muted" />
      </section>
    );
  }

  if (!items?.length) return null;

  const [hero, ...rest] = items;

  return (
    <ContentSectionShell
      title="Innovations"
      icon={<Zap className="h-4 w-4 text-primary" />}
      subtitle="New tech & service breakthroughs"
    >
      <div className="px-4 space-y-2.5">
        <ContentCard item={hero} variant="hero" onOpen={onOpenItem} />
        {rest.length > 0 && (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x pb-1">
            {rest.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                variant="compact"
                onOpen={onOpenItem}
              />
            ))}
          </div>
        )}
      </div>
    </ContentSectionShell>
  );
});

export default InnovationsSection;
