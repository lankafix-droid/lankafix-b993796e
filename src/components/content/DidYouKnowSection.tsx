import { memo } from 'react';
import { Lightbulb } from 'lucide-react';
import ContentSectionShell from './ContentSectionShell';
import ContentCard from './ContentCard';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const DidYouKnowSection = memo(function DidYouKnowSection({ onOpenItem }: Props) {
  const { data: items, isLoading } = useContentIntelligence({
    surface: 'homepage_did_you_know',
    limit: 4,
  });

  if (isLoading) {
    return (
      <section className="py-4 px-4">
        <div className="h-5 w-28 animate-pulse rounded bg-muted mb-2.5" />
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (!items?.length) return null;

  return (
    <ContentSectionShell
      title="Did You Know?"
      icon={<Lightbulb className="h-4 w-4 text-primary" />}
      subtitle="Useful facts for smarter decisions"
    >
      <div className="grid grid-cols-2 gap-2.5 px-4">
        {items.slice(0, 4).map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            variant="compact"
            className="w-full"
            onOpen={onOpenItem}
          />
        ))}
      </div>
    </ContentSectionShell>
  );
});

export default DidYouKnowSection;
