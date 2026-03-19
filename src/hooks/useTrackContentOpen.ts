/**
 * useTrackContentOpen — Fires a single "open" event per content item per session.
 * Safe to call in useEffect only (never in render body).
 */
import { useEffect, useRef } from 'react';
import { trackContentEvent } from '@/hooks/useContentIntelligence';

const openedIds = new Set<string>();

export function useTrackContentOpen(contentItemId: string | undefined) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!contentItemId || firedRef.current || openedIds.has(contentItemId)) return;
    firedRef.current = true;
    openedIds.add(contentItemId);
    trackContentEvent(contentItemId, 'open');
  }, [contentItemId]);
}
