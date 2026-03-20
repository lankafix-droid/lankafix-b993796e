import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useContentIntelligence, trackContentEvent } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronRight, ArrowUpRight, Zap, Lightbulb, Shield, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

const TYPE_ICONS: Record<string, typeof Zap> = {
  breaking_news: Zap, innovation: Lightbulb, safety_alert: Shield, scam_alert: AlertTriangle,
  trend_signal: TrendingUp, market_shift: BarChart3,
};

const AUTOPLAY_MS = 6000;

const AIBannerForum = memo(function AIBannerForum({ onOpenItem }: Props) {
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
  const Icon = TYPE_ICONS[item.content_type] ?? Lightbulb;
  const isEvergreen = item.id.startsWith('evergreen-');
  const isLive = !isEvergreen;
  const isSriLankan = item.source_country === 'lk' || item.source_country === 'LK';

  return (
    <section className="px-4 py-3">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/6 via-card to-accent/4 shadow-sm">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }} />
        {/* Gradient orb */}
        <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-[0.05] bg-primary" />

        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-md text-[10px] font-bold border border-border/30 shadow-sm">
            {isLive ? (
              <>
                <span className="relative mr-1.5 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                AI Insights
              </>
            ) : (
              <><Sparkles className="mr-1 h-3 w-3 text-primary" /> AI Insights</>
            )}
          </Badge>
          {isSriLankan && (
            <Badge variant="outline" className="text-[9px] bg-card/70 backdrop-blur-md border-border/30 font-semibold">🇱🇰</Badge>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 w-full text-left p-4 pt-11"
            onClick={() => {
              if (isLive) trackContentEvent(item.id, 'click', { surface: 'ai_banner_forum' });
              onOpenItem?.(item);
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 border border-primary/15">
                <Icon className="h-4.5 w-4.5 text-primary/70" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-[15px] font-bold text-foreground leading-snug line-clamp-2">
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
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {item.source_name && <span className="font-medium">{item.source_name}</span>}
                    {item.category_tags[0] && (
                      <>
                        <span className="text-border">·</span>
                        <span className="text-primary/70 font-semibold">#{item.category_tags[0].category_code}</span>
                      </>
                    )}
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-primary/30" />
                </div>
              </div>
            </div>
          </motion.button>
        </AnimatePresence>

        {items.length > 1 && (
          <div className="relative z-10 flex justify-center gap-1.5 pb-3">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); resetTimer(); }}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === safeIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40'
                )}
                aria-label={`Show insight ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

export default AIBannerForum;
