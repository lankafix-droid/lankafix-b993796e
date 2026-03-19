/**
 * CategoryContentIntelligence — Renders content intelligence blocks for a category page.
 * Shows featured insight, innovations, knowledge, and safety alerts filtered by category.
 */
import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, TrendingUp, Shield, Hash } from 'lucide-react';
import ContentSectionShell from './ContentSectionShell';
import ContentCard from './ContentCard';
import ContentFactCard from './ContentFactCard';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

interface Props {
  categoryCode: string;
  categoryLabel: string;
}

const CategoryContentIntelligence = memo(function CategoryContentIntelligence({ categoryCode, categoryLabel }: Props) {
  const navigate = useNavigate();

  const { data: featured } = useContentIntelligence({
    surface: 'category_featured',
    categoryCode,
    limit: 3,
  });

  const { data: feedItems } = useContentIntelligence({
    surface: 'category_feed',
    categoryCode,
    limit: 6,
  });

  const handleOpen = useCallback((item: EnrichedContentItem) => {
    navigate(`/insights/${item.id}`);
  }, [navigate]);

  const hasContent = (featured?.length ?? 0) > 0 || (feedItems?.length ?? 0) > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-0">
      {/* Featured Insight */}
      {featured && featured.length > 0 && (
        <ContentSectionShell
          title={`${categoryLabel} Intelligence`}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          subtitle={`Latest insights for ${categoryLabel}`}
        >
          <div className="px-4 space-y-2">
            {featured.slice(0, 1).map(item => (
              <ContentCard key={item.id} item={item} variant="hero" onOpen={handleOpen} />
            ))}
          </div>
        </ContentSectionShell>
      )}

      {/* Category feed rail */}
      {feedItems && feedItems.length > 0 && (
        <ContentSectionShell
          title="More Insights"
          icon={<Lightbulb className="h-4 w-4 text-accent-foreground" />}
        >
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
            {feedItems.map(item => (
              <ContentCard key={item.id} item={item} variant="compact" onOpen={handleOpen} />
            ))}
          </div>
        </ContentSectionShell>
      )}
    </div>
  );
});

export default CategoryContentIntelligence;
