import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Shield, Zap, Lightbulb, Hash, BookOpen, BarChart3, AlertTriangle } from 'lucide-react';
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
  breaking_news: { icon: Zap, label: 'Breaking', accent: 'bg-destructive/10 text-destructive border-destructive/20' },
  hot_topic: { icon: TrendingUp, label: 'Hot Now', accent: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400' },
  innovation: { icon: Lightbulb, label: 'Innovation', accent: 'bg-primary/10 text-primary border-primary/20' },
  trend_signal: { icon: TrendingUp, label: 'Trending', accent: 'bg-accent/10 text-accent-foreground border-accent/20' },
  safety_alert: { icon: Shield, label: 'Safety Alert', accent: 'bg-destructive/10 text-destructive border-destructive/20' },
  scam_alert: { icon: AlertTriangle, label: 'Scam Alert', accent: 'bg-destructive/12 text-destructive border-destructive/25' },
  knowledge_fact: { icon: BookOpen, label: 'Did You Know', accent: 'bg-primary/10 text-primary border-primary/20' },
  history: { icon: Clock, label: 'History', accent: 'bg-muted text-muted-foreground border-border' },
  on_this_day: { icon: Clock, label: 'On This Day', accent: 'bg-muted text-muted-foreground border-border' },
  numbers_insight: { icon: Hash, label: 'Numbers', accent: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400' },
  seasonal_tip: { icon: Lightbulb, label: 'Seasonal', accent: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400' },
  how_to: { icon: BookOpen, label: 'How To', accent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' },
  most_read: { icon: TrendingUp, label: 'Popular', accent: 'bg-accent/10 text-accent-foreground border-accent/20' },
  market_shift: { icon: BarChart3, label: 'Market Shift', accent: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400' },
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
  const isSriLankan = item.source_country === 'lk' || item.source_country === 'LK';
  const isSafety = item.content_type === 'safety_alert' || item.content_type === 'scam_alert';
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
            'flex items-start gap-3 rounded-xl border border-border/40 bg-card p-3 text-left',
            'transition-all duration-200 hover:shadow-md hover:border-border/60 hover:-translate-y-0.5 active:scale-[0.98]',
            'w-[260px] shrink-0 snap-start',
            isSafety && 'border-destructive/15',
            className
          )}
        >
          <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', config.accent)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{headline}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {isLive && item.source_name && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{item.source_name}</span>
              )}
              {isSriLankan && <span className="text-[9px]">🇱🇰</span>}
              <span className="text-[10px] text-muted-foreground">
                {isEvergreen ? 'LankaFix' : formatTimeAgo(item.published_at)}
              </span>
            </div>
          </div>
          {bannerText && (
            <div className="shrink-0 rounded-md bg-primary/10 border border-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
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
            'relative w-full overflow-hidden rounded-2xl bg-card text-left group',
            'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]',
            isSafety && 'ring-1 ring-destructive/15',
            className
          )}
        >
          {item.image_url ? (
            <div className="relative h-44 w-full overflow-hidden">
              <img src={item.image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            </div>
          ) : (
            <div className={cn(
              "h-32 w-full flex items-center justify-center relative overflow-hidden",
              isSafety
                ? "bg-gradient-to-br from-destructive/6 via-card to-destructive/3"
                : "bg-gradient-to-br from-primary/8 via-accent/4 to-primary/3"
            )}>
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="rounded-full bg-card/80 p-3 backdrop-blur-sm shadow-sm border border-border/20">
                <Icon className={cn("h-6 w-6", isSafety ? "text-destructive" : "text-primary")} />
              </div>
            </div>
          )}
          <div className={cn('p-4', item.image_url ? '-mt-16 relative z-10' : '')}>
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Badge variant="secondary" className={cn('text-[10px] font-semibold uppercase tracking-wider border', config.accent)}>
                <Icon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
              {isLive && (
                <Badge variant="outline" className="text-[9px] bg-card/60 backdrop-blur-sm border-primary/15 text-primary">
                  Live
                </Badge>
              )}
              {categoryTags.map(t => (
                <Badge key={t.id} variant="outline" className="text-[10px] bg-card/60 backdrop-blur-sm">{t.category_code}</Badge>
              ))}
              {bannerText && (
                <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/15">
                  {bannerText}
                </Badge>
              )}
            </div>
            <h3 className="text-base font-bold leading-tight text-foreground line-clamp-2">{headline}</h3>
            {summary && <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{summary}</p>}
            {whyMatters && (
              <p className="mt-2 text-xs font-medium text-primary/80 line-clamp-1 italic">💡 {whyMatters}</p>
            )}
            <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              {item.source_name && <span className="font-medium">{item.source_name}</span>}
              <span className="text-border">·</span>
              <span>{isEvergreen ? 'LankaFix Intelligence' : formatTimeAgo(item.published_at)}</span>
              {isSriLankan && (
                <Badge variant="outline" className="text-[9px] py-0 h-4 bg-card/60">🇱🇰 Local</Badge>
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
          'flex gap-3 rounded-xl border border-border/40 bg-card p-3.5 text-left w-full group',
          'transition-all duration-200 hover:shadow-md hover:border-border/60 hover:-translate-y-0.5 active:scale-[0.98]',
          isSafety && 'border-destructive/15',
          className
        )}
      >
        {item.image_url ? (
          <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden">
            <img src={item.image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          </div>
        ) : (
          <div className={cn(
            'h-20 w-20 shrink-0 rounded-lg flex items-center justify-center relative overflow-hidden border border-border/15',
            isSafety
              ? 'bg-gradient-to-br from-destructive/6 via-card to-destructive/3'
              : 'bg-gradient-to-br from-primary/6 via-accent/3 to-muted/30'
          )}>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
            <Icon className={cn("h-5 w-5", isSafety ? "text-destructive/30" : "text-primary/30")} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <Badge variant="secondary" className={cn('text-[10px] font-semibold uppercase tracking-wide border', config.accent)}>
              {config.label}
            </Badge>
            {isLive && item.source_name && (
              <span className="text-[10px] text-muted-foreground/70 truncate max-w-[90px]">{item.source_name}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{isEvergreen ? 'LankaFix' : formatTimeAgo(item.published_at)}</span>
            {isSriLankan && <span className="text-[9px]">🇱🇰</span>}
          </div>
          <h4 className="text-sm font-bold leading-tight text-foreground line-clamp-2">{headline}</h4>
          {summary && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{summary}</p>}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {categoryTags.map(t => (
              <span key={t.id} className="text-[10px] text-primary/60 font-medium">#{t.category_code}</span>
            ))}
            {bannerText && (
              <span className="text-[10px] font-bold text-primary bg-primary/5 rounded-md px-1.5 py-px border border-primary/10">{bannerText}</span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
});

export default ContentCard;
