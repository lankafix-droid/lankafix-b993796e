import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useContentIntelligence, trackContentEvent } from '@/hooks/useContentIntelligence';
import type { EnrichedContentItem } from '@/types/contentIntelligence';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronRight } from 'lucide-react';

interface Props {
  onOpenItem?: (item: EnrichedContentItem) => void;
}

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

  const item = items[active];
  const brief = item?.ai_brief;

  return (
    <section className="px-4 py-3">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-border/50">
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="secondary" className="bg-card/80 backdrop-blur text-[10px] font-semibold">
            <Sparkles className="mr-1 h-3 w-3 text-primary" />
            AI Insights
          </Badge>
        </div>

        <AnimatePresence mode="wait">
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full text-left p-4 pt-10"
            onClick={() => {
              trackContentEvent(item.id, 'click', { surface: 'ai_banner_forum' });
              onOpenItem?.(item);
            }}
          >
            <h3 className="font-heading text-base font-bold text-foreground leading-tight line-clamp-2">
              {brief?.ai_headline ?? item.title}
            </h3>
            {brief?.ai_summary_short && (
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                {brief.ai_summary_short}
              </p>
            )}
            {brief?.ai_lankafix_angle && (
              <p className="mt-2 text-xs font-medium text-primary flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {brief.ai_lankafix_angle}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
              {item.source_name && <span>{item.source_name}</span>}
              {item.category_tags[0] && (
                <>
                  <span>·</span>
                  <span className="text-primary font-medium">#{item.category_tags[0].category_code}</span>
                </>
              )}
            </div>
          </motion.button>
        </AnimatePresence>

        {/* Dots */}
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-3">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); resetTimer(); }}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === active ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

export default AIBannerForum;
