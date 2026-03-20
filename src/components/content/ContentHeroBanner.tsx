/**
 * ContentHeroBanner v3 — Premium rotating intelligence banner.
 * Rich visual hierarchy, glassmorphism accents, live/evergreen signals.
 */
import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useContentIntelligence, trackContentEvent } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronRight, TrendingUp, Shield, Lightbulb, Zap, Hash, BookOpen, BarChart3, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const TYPE_ICONS: Record<string, typeof Zap> = {
  breaking_news: Zap, innovation: Lightbulb, safety_alert: Shield, scam_alert: AlertTriangle,
  trend_signal: TrendingUp, hot_topic: TrendingUp, numbers_insight: Hash,
  knowledge_fact: BookOpen, market_shift: BarChart3,
};

const TYPE_LABELS: Record<string, string> = {
  breaking_news: 'Breaking', innovation: 'Innovation', safety_alert: 'Safety Alert',
  scam_alert: 'Scam Alert', trend_signal: 'Trending', hot_topic: 'Hot Now',
  numbers_insight: 'Numbers', knowledge_fact: 'Insight', market_shift: 'Market Shift',
};

const TYPE_ACCENTS: Record<string, string> = {
  breaking_news: 'bg-destructive/10 text-destructive border-destructive/20',
  innovation: 'bg-primary/10 text-primary border-primary/20',
  safety_alert: 'bg-destructive/10 text-destructive border-destructive/20',
  scam_alert: 'bg-destructive/12 text-destructive border-destructive/25',
  trend_signal: 'bg-accent/10 text-accent-foreground border-accent/20',
  hot_topic: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
  numbers_insight: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
  knowledge_fact: 'bg-primary/10 text-primary border-primary/20',
  market_shift: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
};

const AUTOPLAY_MS = 7000;

const ContentHeroBanner = memo(function ContentHeroBanner({ onOpenItem }: Props) {
  const { data: items } = useContentIntelligence({
    surface: 'homepage_hero',
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
  const accent = TYPE_ACCENTS[item.content_type] ?? 'bg-primary/10 text-primary border-primary/20';
  const isEvergreen = item.id.startsWith('evergreen-');
  const isLive = !isEvergreen;
  const isSriLankan = item.source_country === 'lk' || item.source_country === 'LK';
  const isSafety = item.content_type === 'safety_alert' || item.content_type === 'scam_alert';

  return (
    <section className="px-4 pt-3 pb-1">
      <div className={cn(
        "relative overflow-hidden rounded-2xl border shadow-md",
        isSafety
          ? "border-destructive/25 bg-gradient-to-br from-destructive/5 via-card to-card shadow-destructive/5"
          : "border-border/30 bg-gradient-to-br from-primary/8 via-card to-accent/4 shadow-primary/5"
      )}>
        {/* Premium pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] z-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 35%, hsl(var(--primary)) 1px, transparent 1px),
                            radial-gradient(circle at 80% 65%, hsl(var(--primary)) 0.5px, transparent 0.5px)`,
          backgroundSize: '30px 30px, 22px 22px'
        }} />

        {/* Gradient orb for depth */}
        <div className={cn(
          "absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-[0.06] z-0",
          isSafety ? "bg-destructive" : "bg-primary"
        )} />

        {/* Image overlay for items with images */}
        {item.image_url && (
          <div className="absolute inset-0 z-0">
            <img src={item.image_url} alt="" className="h-full w-full object-cover opacity-15" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/90 to-card/75" />
          </div>
        )}

        {/* Top badge row */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-md text-[10px] font-bold tracking-wide border border-border/30 shadow-sm">
            {isLive ? (
              <>
                <span className="relative mr-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Live Intelligence
              </>
            ) : (
              <><Sparkles className="mr-1 h-3 w-3 text-primary" /> LankaFix Intelligence</>
            )}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] bg-card/70 backdrop-blur-md border", accent)}>
            <Icon className="mr-0.5 h-3 w-3" />
            {label}
          </Badge>
          {isSriLankan && (
            <Badge variant="outline" className="text-[9px] bg-card/70 backdrop-blur-md py-0 border-border/30 font-semibold">
              🇱🇰 Sri Lanka
            </Badge>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative z-10 w-full text-left p-4 pt-12"
            onClick={() => {
              if (isLive) trackContentEvent(item.id, 'click', { surface: 'homepage_hero' });
              onOpenItem?.(item);
            }}
          >
            {/* Banner stat */}
            {brief?.ai_banner_text && (
              <div className="mb-2 inline-flex items-center rounded-lg bg-primary/8 border border-primary/15 px-2.5 py-1 text-xs font-bold text-primary shadow-sm">
                {brief.ai_banner_text}
              </div>
            )}

            <h3 className="font-heading text-[17px] font-bold text-foreground leading-snug line-clamp-2 pr-6">
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
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
              <ArrowUpRight className="h-4 w-4 text-primary/30" />
            </div>
          </motion.button>
        </AnimatePresence>

        {/* Progress indicators */}
        {items.length > 1 && (
          <div className="relative z-10 flex justify-center gap-1.5 pb-3">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); resetTimer(); }}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === active ? 'w-7 bg-primary shadow-sm' : 'w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40'
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
