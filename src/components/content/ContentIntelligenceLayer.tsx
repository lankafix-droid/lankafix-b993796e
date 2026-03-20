import { lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EnrichedContentItem } from '@/types/contentIntelligence';

const HotNowSection = lazy(() => import('./HotNowSection'));
const DidYouKnowSection = lazy(() => import('./DidYouKnowSection'));
const InnovationsSection = lazy(() => import('./InnovationsSection'));
const SafetyAlertsSection = lazy(() => import('./SafetyAlertsSection'));
const NumbersInsightSection = lazy(() => import('./NumbersInsightSection'));
const PopularThisWeekSection = lazy(() => import('./PopularThisWeekSection'));
const ContentHeroBanner = lazy(() => import('./ContentHeroBanner'));
const AIBannerForum = lazy(() => import('./AIBannerForum'));

const Fallback = () => <div className="h-12" aria-hidden />;

/**
 * ContentIntelligenceLayer — All homepage content sections.
 * Premium ordering: Hero → Hot Now → Safety → Innovations → AI Banner → Numbers → Did You Know → Popular
 */
export default function ContentIntelligenceLayer() {
  const navigate = useNavigate();

  const handleOpenItem = useCallback((item: EnrichedContentItem) => {
    navigate(`/insights/${item.id}`);
  }, [navigate]);

  return (
    <div className="space-y-0">
      <Suspense fallback={<Fallback />}>
        <ContentHeroBanner onOpenItem={handleOpenItem} />
      </Suspense>
      <Suspense fallback={<Fallback />}>
        <HotNowSection onOpenItem={handleOpenItem} />
      </Suspense>
      <Suspense fallback={<Fallback />}>
        <SafetyAlertsSection onOpenItem={handleOpenItem} />
      </Suspense>
      <Suspense fallback={<Fallback />}>
        <InnovationsSection onOpenItem={handleOpenItem} />
      </Suspense>
      <Suspense fallback={<Fallback />}>
        <AIBannerForum onOpenItem={handleOpenItem} />
      </Suspense>
      <Suspense fallback={<Fallback />}>
        <NumbersInsightSection onOpenItem={handleOpenItem} />
      </Suspense>
      <Suspense fallback={<Fallback />}>
        <DidYouKnowSection onOpenItem={handleOpenItem} />
      </Suspense>
      <Suspense fallback={<Fallback />}>
        <PopularThisWeekSection onOpenItem={handleOpenItem} />
      </Suspense>
    </div>
  );
}
