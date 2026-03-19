/**
 * ContentFactCard — Premium visual card for numbers/facts/statistics.
 * Uses category-colored backgrounds and bold typography.
 */
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Hash, TrendingUp } from 'lucide-react';
import type { EnrichedContentItem } from '@/types/contentIntelligence';
import { trackContentEvent } from '@/hooks/useContentIntelligence';

interface Props {
  item: EnrichedContentItem;
  index: number;
  onOpen?: (item: EnrichedContentItem) => void;
  className?: string;
}

const ACCENT_SCHEMES = [
  'bg-primary/10 border-primary/15',
  'bg-accent/10 border-accent/15',
  'bg-warning/10 border-warning/15',
  'bg-secondary border-secondary/50',
  'bg-destructive/5 border-destructive/10',
];

const ContentFactCard = memo(function ContentFactCard({ item, index, onOpen, className }: Props) {
  const brief = item.ai_brief;
  const headline = brief?.ai_headline ?? item.title;
  const bannerText = brief?.ai_banner_text;
  const category = item.category_tags[0]?.category_code ?? 'Insight';
  const scheme = ACCENT_SCHEMES[index % ACCENT_SCHEMES.length];

  return (
    <button
      onClick={() => {
        trackContentEvent(item.id, 'click');
        onOpen?.(item);
      }}
      className={cn(
        'flex flex-col justify-between rounded-xl border p-4 snap-start shrink-0 w-[200px] min-h-[130px]',
        'transition-all duration-200 hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]',
        scheme,
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Hash className="h-3 w-3 text-muted-foreground" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {category}
        </p>
      </div>
      {bannerText ? (
        <p className="text-2xl font-heading font-extrabold text-foreground leading-none mt-2">
          {bannerText}
        </p>
      ) : (
        <TrendingUp className="h-6 w-6 text-primary/40 mt-2" />
      )}
      <p className="text-xs font-medium text-foreground/80 line-clamp-2 mt-auto pt-1.5 leading-snug">
        {headline}
      </p>
    </button>
  );
});

export default ContentFactCard;
