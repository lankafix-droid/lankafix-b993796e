import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Shield, Zap, Lightbulb, Hash, BookOpen, BarChart3 } from 'lucide-react';
import type { EnrichedContentItem, ContentType } from '@/types/contentIntelligence';
import { trackContentEvent } from '@/hooks/useContentIntelligence';
import { useTrackContentImpression } from '@/hooks/useTrackContentImpression';

interface ContentCardProps {
  item: EnrichedContentItem;
  variant?: 'compact' | 'standard' | 'hero';
  className?: string;
  onOpen?: (item: EnrichedContentItem) => void;
}

const TYPE_CONFIG: Record<ContentType, { icon: typeof Clock; label: string; accent: string }> = {
  breaking_news: { icon: Zap, label: 'Breaking', accent: 'bg-destructive/10 text-destructive' },
  hot_topic: { icon: TrendingUp, label: 'Hot Now', accent: 'bg-warning/10 text-warning' },
  innovation: { icon: Lightbulb, label: 'Innovation', accent: 'bg-primary/10 text-primary' },
  trend_signal: { icon: TrendingUp, label: 'Trending', accent: 'bg-accent/10 text-accent-foreground' },
  safety_alert: { icon: Shield, label: 'Safety Alert', accent: 'bg-destructive/10 text-destructive' },
  scam_alert: { icon: Shield, label: 'Scam Alert', accent: 'bg-destructive/15 text-destructive font-bold' },
  knowledge_fact: { icon: BookOpen, label: 'Did You Know', accent: 'bg-primary/10 text-primary' },
  history: { icon: Clock, label: 'History', accent: 'bg-muted text-muted-foreground' },
  on_this_day: { icon: Clock, label: 'On This Day', accent: 'bg-muted text-muted-foreground' },
  numbers_insight: { icon: Hash, label: 'Numbers', accent: 'bg-accent/10 text-accent-foreground' },
  seasonal_tip: { icon: Lightbulb, label: 'Seasonal', accent: 'bg-warning/10 text-warning' },
  how_to: { icon: BookOpen, label: 'How To', accent: 'bg-primary/10 text-primary' },
  most_read: { icon: TrendingUp, label: 'Popular', accent: 'bg-accent/10 text-accent-foreground' },
  market_shift: { icon: BarChart3, label: 'Market Shift', accent: 'bg-primary/10 text-primary' },
};

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const ContentCard = memo(function ContentCard({ item, variant = 'standard', className, onOpen }: ContentCardProps) {
  const config = TYPE_CONFIG[item.content_type] ?? TYPE_CONFIG.hot_topic;
  const Icon = config.icon;
  const brief = item.ai_brief;
  const headline = brief?.ai_headline ?? item.title;
  const summary = brief?.ai_summary_short ?? item.raw_excerpt ?? '';
  const whyMatters = brief?.ai_why_it_matters;
  const bannerText = brief?.ai_banner_text;
  const categoryTags = item.category_tags.slice(0, 2);
  const isEvergreen = item.id.startsWith('evergreen-');
  const isLive = !isEvergreen;
  const impressionRef = useTrackContentImpression(item.id, variant);

  const handleClick = () => {
    if (isLive) {
      trackContentEvent(item.id, 'click', { variant });
    }
    onOpen?.(item);
  };

  if (variant === 'compact') {
    return (
      <div ref={impressionRef}>
        <button
          onClick={handleClick}
          className={cn(
            'flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3 text-left',
            'transition-all hover:shadow-sm hover:border-border/70 active:scale-[0.98]',
            'w-[260px] shrink-0 snap-start',
            className
          )}
        >
          <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', config.accent)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{headline}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {isLive && item.source_name && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{item.source_name}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{isEvergreen ? 'LankaFix' : formatTimeAgo(item.published_at)}</span>
            </div>
          </div>
          {/* Banner stat chip for compact cards with numbers */}
          {bannerText && (
            <div className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {bannerText}
            </div>
          )}
        </button>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div ref={impressionRef}>
        <button
          onClick={handleClick}
          className={cn(
            'relative w-full overflow-hidden rounded-2xl bg-card text-left',
            'transition-all hover:shadow-md active:scale-[0.99]',
            className
          )}
        >
          {item.image_url ? (
            <div className="relative h-44 w-full">
              <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            </div>
          ) : (
            <div className="h-32 w-full bg-gradient-to-br from-primary/12 via-accent/8 to-primary/4 flex items-center justify-center">
              <div className="rounded-full bg-card/80 p-3 backdrop-blur-sm">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            </div>
          )}
          <div className={cn('p-4', item.image_url ? '-mt-16 relative z-10' : '')}>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className={cn('text-[10px] font-semibold uppercase tracking-wider', config.accent)}>
                <Icon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
              {categoryTags.map(t => (
                <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
              ))}
              {bannerText && (
                <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary">
                  {bannerText}
                </Badge>
              )}
            </div>
            <h3 className="text-base font-bold leading-tight text-foreground line-clamp-2">{headline}</h3>
            {summary && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{summary}</p>}
            {whyMatters && (
              <p className="mt-2 text-xs font-medium text-primary line-clamp-1">💡 {whyMatters}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {item.source_name && <span className="font-medium">{item.source_name}</span>}
              <span>·</span>
              <span>{isEvergreen ? 'LankaFix Intelligence' : formatTimeAgo(item.published_at)}</span>
              {item.source_country === 'lk' && (
                <Badge variant="outline" className="text-[9px] py-0 h-4">🇱🇰 Sri Lanka</Badge>
              )}
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Standard card
  return (
    <div ref={impressionRef}>
      <button
        onClick={handleClick}
        className={cn(
          'flex gap-3 rounded-xl border border-border/50 bg-card p-3.5 text-left w-full',
          'transition-all hover:shadow-sm hover:border-border/70 active:scale-[0.98]',
          className
        )}
      >
        {item.image_url ? (
          <img src={item.image_url} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
        ) : (
          <div className={cn(
            'h-20 w-20 shrink-0 rounded-lg flex items-center justify-center',
            'bg-gradient-to-br from-primary/8 via-accent/5 to-primary/3'
          )}>
            <Icon className="h-6 w-6 text-primary/50" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <Badge variant="secondary" className={cn('text-[10px] font-semibold uppercase', config.accent)}>
              {config.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{isEvergreen ? 'LankaFix' : formatTimeAgo(item.published_at)}</span>
            {item.source_country === 'lk' && (
              <span className="text-[9px]">🇱🇰</span>
            )}
          </div>
          <h4 className="text-sm font-bold leading-tight text-foreground line-clamp-2">{headline}</h4>
          {summary && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{summary}</p>}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {categoryTags.map(t => (
              <span key={t.id} className="text-[10px] text-primary font-medium">#{t.category_code}</span>
            ))}
            {bannerText && (
              <span className="text-[10px] font-bold text-primary bg-primary/5 rounded px-1">{bannerText}</span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
});

export default ContentCard;
