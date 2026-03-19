/**
 * ContentHeroBanner — Premium rotating intelligence banner for homepage hero.
 * Shows AI-ranked top stories with autoplay and category-colored accents.
 */
import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useContentIntelligence, trackContentEvent } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronRight, TrendingUp, Shield, Lightbulb, Zap } from 'lucide-react';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const TYPE_ICONS: Record<string, typeof Zap> = {
  breaking_news: Zap,
  innovation: Lightbulb,
  safety_alert: Shield,
  trend_signal: TrendingUp,
  hot_topic: TrendingUp,
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

  return (
    <section className="px-4 py-3">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/8 via-card to-accent/5 shadow-sm">
        {/* Image overlay for items with images */}
        {item.image_url && (
          <div className="absolute inset-0 z-0">
            <img src={item.image_url} alt="" className="h-full w-full object-cover opacity-15" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/80 to-card/60" />
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur text-[10px] font-bold tracking-wide">
            <Sparkles className="mr-1 h-3 w-3 text-primary" />
            AI Insights
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-card/60 backdrop-blur">
            <Icon className="mr-0.5 h-3 w-3" />
            {item.content_type.replace(/_/g, ' ')}
          </Badge>
        </div>

        <AnimatePresence mode="wait">
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative z-10 w-full text-left p-4 pt-11"
            onClick={() => {
              trackContentEvent(item.id, 'click', { surface: 'ai_banner_forum' });
              onOpenItem?.(item);
            }}
          >
            <h3 className="font-heading text-base font-bold text-foreground leading-snug line-clamp-2 pr-2">
              {brief?.ai_headline ?? item.title}
            </h3>
            {brief?.ai_summary_short && (
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {brief.ai_summary_short}
              </p>
            )}
            {brief?.ai_lankafix_angle && (
              <p className="mt-2 text-xs font-semibold text-primary flex items-center gap-1">
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{brief.ai_lankafix_angle}</span>
              </p>
            )}
            <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              {item.source_name && <span className="font-medium">{item.source_name}</span>}
              {item.category_tags[0] && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-primary/80 font-semibold">#{item.category_tags[0].category_code}</span>
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
                  i === active ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40'
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
