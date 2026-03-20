/**
 * ContentHeroBanner — Premium rotating intelligence banner for homepage hero.
 * Shows AI-ranked top stories with autoplay and category-colored accents.
 * Supports both live content and evergreen fallback seamlessly.
 */
import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useContentIntelligence, trackContentEvent } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronRight, TrendingUp, Shield, Lightbulb, Zap, Hash, BookOpen, Radio, BarChart3 } from 'lucide-react';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const TYPE_ICONS: Record<string, typeof Zap> = {
  breaking_news: Zap,
  innovation: Lightbulb,
  safety_alert: Shield,
  scam_alert: Shield,
  trend_signal: TrendingUp,
  hot_topic: TrendingUp,
  numbers_insight: Hash,
  knowledge_fact: BookOpen,
  market_shift: BarChart3,
};

const TYPE_LABELS: Record<string, string> = {
  breaking_news: 'Breaking',
  innovation: 'Innovation',
  safety_alert: 'Safety Alert',
  scam_alert: 'Scam Alert',
  trend_signal: 'Trending',
  hot_topic: 'Hot Now',
  numbers_insight: 'Numbers',
  knowledge_fact: 'Insight',
  market_shift: 'Market',
};

const AUTOPLAY_MS = 7000;

const ContentHeroBanner = memo(function ContentHeroBanner({ onOpenItem }: Props) {
  const { data: items } = useContentIntelligence({
    surface: 'ai_banner_forum',
    limit: 5,
  });

  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    if (items?.length && items.length > 1) {
      timerRef.current = setInterval(() => {
        setActive(p => (p + 1) % items.length);
      }, AUTOPLAY_MS);
    }
  }, [items?.length]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  if (!items?.length) return null;

  const safeIdx = active < items.length ? active : 0;
  const item = items[safeIdx];
  if (!item) return null;
  const brief = item.ai_brief;
  const Icon = TYPE_ICONS[item.content_type] ?? TrendingUp;
  const label = TYPE_LABELS[item.content_type] ?? 'Insight';
  const isEvergreen = item.id.startsWith('evergreen-');
  const isLive = !isEvergreen;
  const isSriLankan = item.source_country === 'lk' || item.source_country === 'LK';

  return (
    <section className="px-4 py-3">
      <div className="relative overflow-hidden rounded-2xl border border-border/20 bg-gradient-to-br from-primary/6 via-card to-accent/3 shadow-sm">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.015] z-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* Image overlay */}
        {item.image_url && (
          <div className="absolute inset-0 z-0">
            <img src={item.image_url} alt="" className="h-full w-full object-cover opacity-10" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/85 to-card/70" />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-[10px] font-bold tracking-wide border border-border/20 shadow-sm">
            {isLive ? (
              <>
                <span className="relative mr-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </>
            ) : (
              <><Sparkles className="mr-1 h-3 w-3 text-primary" /> AI Insights</>
            )}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-card/60 backdrop-blur-sm border-border/20">
            <Icon className="mr-0.5 h-3 w-3" />
            {label}
          </Badge>
          {isSriLankan && (
            <Badge variant="outline" className="text-[9px] bg-card/60 backdrop-blur-sm py-0 border-border/20">
              🇱🇰
            </Badge>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-10 w-full text-left p-4 pt-11"
            onClick={() => {
              if (isLive) {
                trackContentEvent(item.id, 'click', { surface: 'ai_banner_forum' });
              }
              onOpenItem?.(item);
            }}
          >
            {/* Banner stat */}
            {brief?.ai_banner_text && (
              <div className="mb-2 inline-flex items-center rounded-lg bg-primary/8 border border-primary/12 px-2.5 py-0.5 text-xs font-bold text-primary">
                {brief.ai_banner_text}
              </div>
            )}

            <h3 className="font-heading text-base font-bold text-foreground leading-snug line-clamp-2 pr-2">
              {brief?.ai_headline ?? item.title}
            </h3>
            {brief?.ai_summary_short && (
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {brief.ai_summary_short}
              </p>
            )}
            {brief?.ai_lankafix_angle && (
              <p className="mt-2 text-xs font-semibold text-primary/80 flex items-center gap-1">
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{brief.ai_lankafix_angle}</span>
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
              {item.source_name && <span className="font-medium">{item.source_name}</span>}
              {item.category_tags[0] && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-primary/70 font-semibold">#{item.category_tags[0].category_code}</span>
                </>
              )}
              {brief?.ai_cta_label && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-primary font-semibold">{brief.ai_cta_label} →</span>
                </>
              )}
            </div>
          </motion.button>
        </AnimatePresence>

        {/* Progress dots */}
        {items.length > 1 && (
          <div className="relative z-10 flex justify-center gap-1.5 pb-3">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); resetTimer(); }}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === active ? 'w-6 bg-primary shadow-sm' : 'w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40'
                )}
                aria-label={`Show slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

export default ContentHeroBanner;
