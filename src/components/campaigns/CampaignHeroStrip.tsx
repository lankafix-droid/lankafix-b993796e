import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Campaign } from '@/types/campaign';
import CampaignCard from './CampaignCard';
import { trackCampaignEvent } from '@/lib/campaignAnalytics';
import { recordInteraction } from '@/services/userBehaviorEngine';
import type { VisualContext } from '@/services/sriLankanThemeEngine';

interface CampaignHeroStripProps {
  campaigns: Campaign[];
  loading?: boolean;
  className?: string;
  visualContext?: VisualContext;
}

const AUTOPLAY_MS = 5500;

/** Shimmer skeleton matching hero card dimensions */
const HeroSkeleton = () => (
  <div className="mx-4 space-y-3">
    <div className="h-[180px] animate-pulse rounded-2xl bg-muted" />
    <div className="flex justify-center gap-1.5">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-1.5 w-4 animate-pulse rounded-full bg-muted" />
      ))}
    </div>
  </div>
);

const CampaignHeroStrip = memo(({ campaigns, loading, className, visualContext }: CampaignHeroStripProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef(0);
  const count = campaigns.length;

  // Autoplay with pause support
  useEffect(() => {
    if (paused || count <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex(i => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, count]);

  // Track viewable impressions + AI behavior
  useEffect(() => {
    if (campaigns[activeIndex]) {
      trackCampaignEvent(campaigns[activeIndex].id, 'viewable_impression', {
        index: activeIndex,
        campaign_type: campaigns[activeIndex].campaign_type,
      });
      recordInteraction({
        categoryId: campaigns[activeIndex].category_ids?.[0],
        campaignType: campaigns[activeIndex].campaign_type,
        interactionType: 'view',
        timestamp: Date.now(),
      });
    }
  }, [activeIndex, campaigns]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      const direction = diff > 0 ? 1 : -1;
      setActiveIndex(i => (i + direction + count) % count);
      trackCampaignEvent(campaigns[activeIndex]?.id || '', 'card_swipe', {
        direction: diff > 0 ? 'left' : 'right',
      });
    }
    setTimeout(() => setPaused(false), 4000);
  }, [count, activeIndex, campaigns]);

  if (loading) return <HeroSkeleton />;
  if (count === 0) return null;

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Cultural greeting banner */}
      {visualContext?.isFestive && visualContext.culturalMoment?.greeting && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-2 flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-center"
          style={{ 
            background: `linear-gradient(135deg, hsl(${visualContext.culturalMoment.accentHsl} / 0.12), transparent)`,
            border: `1px solid hsl(${visualContext.culturalMoment.accentHsl} / 0.2)`,
          }}
        >
          <span className="text-base">{visualContext.culturalMoment.icon}</span>
          <span className="text-xs font-medium text-foreground/80">
            {visualContext.culturalMoment.greeting}
          </span>
        </motion.div>
      )}

      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={campaigns[activeIndex].id}
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <CampaignCard 
              campaign={campaigns[activeIndex]} 
              variant="hero" 
              visualContext={visualContext}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators with active animation */}
      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {campaigns.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveIndex(i);
                setPaused(true);
                setTimeout(() => setPaused(false), 4000);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === activeIndex
                  ? 'w-6 bg-primary shadow-sm'
                  : 'w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40',
              )}
              aria-label={`Campaign ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

CampaignHeroStrip.displayName = 'CampaignHeroStrip';
export default CampaignHeroStrip;
