import { memo } from 'react';
import { Hash } from 'lucide-react';
import ContentSectionShell from './ContentSectionShell';
import { useContentIntelligence } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';
import { trackContentEvent } from '@/hooks/useContentIntelligence';
import { cn } from '@/lib/utils';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const NumbersInsightSection = memo(function NumbersInsightSection({ onOpenItem }: Props) {
  const { data: items, isLoading } = useContentIntelligence({
    surface: 'homepage_numbers',
    limit: 4,
  });

  if (isLoading || !items?.length) return null;

  return (
    <ContentSectionShell
      title="Interesting Numbers"
      icon={<Hash className="h-4 w-4 text-accent" />}
      subtitle="Facts that matter"
    >
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x pb-1">
        {items.map((item, i) => {
          const brief = item.ai_brief;
          const headline = brief?.ai_headline ?? item.title;
          const bannerText = brief?.ai_banner_text;
          return (
            <button
              key={item.id}
              onClick={() => {
                trackContentEvent(item.id, 'click');
                onOpenItem?.(item);
              }}
              className={cn(
                'flex flex-col justify-between rounded-xl p-4 snap-start shrink-0 w-[200px] min-h-[120px]',
                'transition-all hover:scale-[1.02] active:scale-[0.98]',
                i % 4 === 0 ? 'bg-primary/10' :
                i % 4 === 1 ? 'bg-accent/10' :
                i % 4 === 2 ? 'bg-warning/10' :
                'bg-secondary',
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {item.category_tags[0]?.category_code ?? 'Insight'}
              </p>
              {bannerText && (
                <p className="text-xl font-heading font-bold text-foreground leading-tight mt-1">
                  {bannerText}
                </p>
              )}
              <p className="text-xs font-medium text-foreground/80 line-clamp-2 mt-auto">
                {headline}
              </p>
            </button>
          );
        })}
      </div>
    </ContentSectionShell>
  );
});

export default NumbersInsightSection;
