/**
 * CategoryInsightBlock — Category-specific content intelligence for category pages.
 * Shows featured insight, innovation, facts, and safety relevant to one category.
 */
import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';
import ContentSectionShell from './ContentSectionShell';
import ContentCard from './ContentCard';
import { Lightbulb, Zap, Shield, BookOpen } from 'lucide-react';

interface Props {
  categoryCode: string;
  categoryLabel: string;
}

const CategoryInsightBlock = memo(function CategoryInsightBlock({ categoryCode, categoryLabel }: Props) {
  const navigate = useNavigate();

  const { data: featured } = useContentIntelligence({
    surface: 'category_featured',
    categoryCode,
    limit: 3,
  });

  const { data: feedItems } = useContentIntelligence({
    surface: 'category_feed',
    categoryCode,
    limit: 4,
  });

  const handleOpen = useCallback((item: EnrichedContentItem) => {
    navigate(`/insights/${item.id}`);
  }, [navigate]);

  // Combine and split by type
  const allItems = [...(featured ?? []), ...(feedItems ?? [])];
  if (!allItems.length) return null;

  const innovations = allItems.filter(i => ['innovation', 'trend_signal', 'market_shift'].includes(i.content_type));
  const safety = allItems.filter(i => ['safety_alert', 'scam_alert'].includes(i.content_type));
  const knowledge = allItems.filter(i => ['knowledge_fact', 'how_to', 'numbers_insight', 'history'].includes(i.content_type));
  const hero = allItems[0];

  return (
    <div className="space-y-0">
      {/* Featured insight */}
      {hero && (
        <ContentSectionShell
          title={`${categoryLabel} Intelligence`}
          icon={<BookOpen className="h-4 w-4 text-primary" />}
          subtitle={`Latest insights for ${categoryLabel}`}
        >
          <div className="px-4">
            <ContentCard item={hero} variant="hero" onOpen={handleOpen} />
          </div>
        </ContentSectionShell>
      )}

      {/* Innovations */}
      {innovations.length > 0 && (
        <ContentSectionShell
          title="Innovation & Trends"
          icon={<Zap className="h-4 w-4 text-primary" />}
        >
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x pb-1">
            {innovations.map(item => (
              <ContentCard key={item.id} item={item} variant="compact" onOpen={handleOpen} />
            ))}
          </div>
        </ContentSectionShell>
      )}

      {/* Safety */}
      {safety.length > 0 && (
        <ContentSectionShell
          title="Safety & Alerts"
          icon={<Shield className="h-4 w-4 text-destructive" />}
        >
          <div className="px-4 space-y-2">
            {safety.map(item => (
              <ContentCard key={item.id} item={item} variant="standard" onOpen={handleOpen} />
            ))}
          </div>
        </ContentSectionShell>
      )}

      {/* Knowledge */}
      {knowledge.length > 0 && (
        <ContentSectionShell
          title="Useful Facts"
          icon={<Lightbulb className="h-4 w-4 text-primary" />}
        >
          <div className="grid grid-cols-2 gap-2.5 px-4">
            {knowledge.slice(0, 4).map(item => (
              <ContentCard key={item.id} item={item} variant="compact" className="w-full" onOpen={handleOpen} />
            ))}
          </div>
        </ContentSectionShell>
      )}
    </div>
  );
});

export default CategoryInsightBlock;
