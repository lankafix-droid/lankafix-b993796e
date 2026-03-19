/**
 * useTrackContentImpression — Fires a single impression event when a card enters the viewport.
 * Uses IntersectionObserver, not render-body side effects.
 */
import { useEffect, useRef } from 'react';
import { trackContentEvent } from '@/hooks/useContentIntelligence';

const tracked = new Set<string>();

export function useTrackContentImpression(contentItemId: string | undefined, surface?: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentItemId || tracked.has(contentItemId)) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.has(contentItemId)) {
          tracked.add(contentItemId);
          trackContentEvent(contentItemId, 'impression', surface ? { surface } : undefined);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [contentItemId, surface]);

  return ref;
}
