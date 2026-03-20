/* Content Intelligence Ops v10.1 — SL-priority backlog burn, premium surface strategy */
import { useState, useMemo } from 'react';
import PageTransition from '@/components/motion/PageTransition';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RefreshCw, CheckCircle, XCircle, Trash2, Pin, BarChart3,
  Activity, Eye, TrendingUp, AlertTriangle, Power, RotateCw, Star,
  Clock, Shield, Database, Layers, Radio, Zap, ChevronUp,
  Play, Pause, Search, Filter, Gauge, Timer, FileText,
  Bell, ShieldAlert, Lock, Unlock, History
} from 'lucide-react';

function EmptyState({ message, icon: Icon }: { message: string; icon?: any }) {
  const I = Icon ?? Database;
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <I className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, subtitle }: { label: string; value: number | string; icon: any; color: string; subtitle?: string }) {
  return (
    <Card className="p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {subtitle && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </Card>
  );
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type SourceHealth = 'healthy' | 'warning' | 'critical' | 'disabled';

function getSourceHealth(src: any): SourceHealth {
  if (!src.active) return 'disabled';
  if (src.rollout_state === 'quarantined') return 'critical';
  const rejectRate = src.counts.total > 0 ? src.counts.rejected / src.counts.total : 0;
  const publishRate = src.counts.total > 0 ? src.counts.published / src.counts.total : 0;
  const isStale = src.last_fetched_at && (Date.now() - new Date(src.last_fetched_at).getTime()) > 24 * 3600000;
  const neverFetched = src.active && !src.last_fetched_at;
  const isZeroPublish = src.counts.total >= 5 && src.counts.published === 0;
  const isHighReject = src.counts.total >= 5 && rejectRate > 0.5;
  const isLowYield = src.counts.total >= 5 && publishRate < 0.2;
  if (isZeroPublish || isHighReject || (isStale && src.counts.total > 0)) return 'critical';
  if (isLowYield || isStale || neverFetched) return 'warning';
  return 'healthy';
}

const HEALTH_STYLES: Record<SourceHealth, string> = {
  healthy: 'border-primary/30',
  warning: 'border-warning/40 bg-warning/3',
  critical: 'border-destructive/30 bg-destructive/3',
  disabled: 'border-muted/40 bg-muted/5 opacity-60',
};

const HEALTH_DOT: Record<SourceHealth, string> = {
  healthy: 'bg-primary', warning: 'bg-warning', critical: 'bg-destructive', disabled: 'bg-muted-foreground',
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  tier1_safe: { label: 'Tier 1', color: 'text-primary border-primary/20 bg-primary/5' },
  tier2_controlled: { label: 'Tier 2', color: 'text-accent-foreground border-accent/20 bg-accent/5' },
  tier3_experimental: { label: 'Tier 3', color: 'text-warning border-warning/20 bg-warning/5' },
};

const ROLLOUT_STATE_LABELS: Record<string, { label: string; color: string }> = {
  inactive: { label: 'Inactive', color: 'text-muted-foreground border-muted' },
  validated: { label: 'Validated', color: 'text-primary border-primary/20' },
  pilot_live: { label: 'Pilot', color: 'text-accent-foreground border-accent/20' },
  production_live: { label: 'Production', color: 'text-primary border-primary/30 bg-primary/5' },
  failing: { label: 'Failing', color: 'text-destructive border-destructive/30' },
  quarantined: { label: 'Quarantined', color: 'text-destructive border-destructive/30 bg-destructive/5' },
};

const SURFACE_ROLLOUT_MODES = ['evergreen_only', 'hybrid_preview', 'hybrid_live', 'live_preferred', 'editorial_only'] as const;

const SOURCE_ROLLOUT_TRANSITIONS: Record<string, string[]> = {
  inactive: ['validated'],
  validated: ['pilot_live', 'inactive'],
  pilot_live: ['production_live', 'validated', 'quarantined'],
  production_live: ['quarantined', 'pilot_live'],
  failing: ['quarantined', 'validated', 'inactive'],
  quarantined: ['validated', 'inactive'],
};

type CategoryReadiness = 'ready' | 'weak' | 'fallback_only' | 'blocked';

function getCategoryReadiness(data: { featured: number; feed: number; live: number; evergreen: number }): CategoryReadiness {
  if (data.live >= 3 && data.featured >= 1) return 'ready';
  if (data.live >= 1) return 'weak';
  if (data.evergreen > 0) return 'fallback_only';
  return 'blocked';
}

const READINESS_STYLES: Record<CategoryReadiness, { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'text-primary border-primary/20 bg-primary/5' },
  weak: { label: 'Weak', color: 'text-warning border-warning/20 bg-warning/5' },
  fallback_only: { label: 'Fallback', color: 'text-muted-foreground border-muted' },
  blocked: { label: 'Blocked', color: 'text-destructive border-destructive/20 bg-destructive/5' },
};

function classifySourceTier(src: any): string {
  if (src.trust_score >= 0.8 && src.base_url) return 'tier1_safe';
  if (src.trust_score >= 0.7 && src.base_url) return 'tier2_controlled';
  return 'tier3_experimental';
}

function classifySourceReadiness(src: any): string {
  if (!src.active) return 'disabled';
  if (!src.base_url) return 'needs_url';
  if (src.trust_score < 0.5) return 'low_trust';
  if ((src.sri_lanka_bias ?? 0) >= 0.7) return 'sl_relevant';
  if ((src.sri_lanka_bias ?? 0) < 0.3 && src.base_url) return 'global_only';
  return 'ready';
}

function SourceHealthBadges({ src }: { src: any }) {
  const badges: React.ReactNode[] = [];
  if (!src.active) {
    badges.push(<Badge key="dis" variant="secondary" className="text-[9px]">Disabled</Badge>);
    return <>{badges}</>;
  }

  const tier = classifySourceTier(src);
  const tierInfo = TIER_LABELS[tier];
  if (tierInfo) badges.push(<Badge key="tier" variant="outline" className={`text-[9px] ${tierInfo.color}`}>{tierInfo.label}</Badge>);

  const rolloutInfo = ROLLOUT_STATE_LABELS[src.rollout_state ?? 'inactive'];
  if (rolloutInfo) badges.push(<Badge key="rstate" variant="outline" className={`text-[9px] ${rolloutInfo.color}`}>{rolloutInfo.label}</Badge>);

  if (!src.base_url) badges.push(<Badge key="nourl" variant="outline" className="text-[9px] text-warning border-warning/30">No URL</Badge>);

  // Source blocking badges
  if (src.source_vendor === 'newsdata' && src.rollout_state === 'failing') {
    badges.push(<Badge key="blocked" variant="destructive" className="text-[9px]">🔑 Blocked by key</Badge>);
  }
  if (src.rollout_state === 'failing' && src.source_vendor !== 'newsdata') {
    badges.push(<Badge key="authfail" variant="destructive" className="text-[9px]">Auth failed</Badge>);
  }

  if (!src.last_fetched_at) {
    badges.push(<Badge key="nf" variant="outline" className="text-[9px] text-warning border-warning/30">Never fetched</Badge>);
  } else {
    const hours = (Date.now() - new Date(src.last_fetched_at).getTime()) / 3600000;
    if (hours > 24) badges.push(<Badge key="stale" variant="destructive" className="text-[9px]">Stale ({Math.floor(hours)}h)</Badge>);
    else badges.push(<Badge key="ok" variant="outline" className="text-[9px] text-primary border-primary/30">{formatTimeAgo(src.last_fetched_at)}</Badge>);
  }

  if (src.counts.total >= 5 && src.counts.published === 0) {
    badges.push(<Badge key="zp" variant="destructive" className="text-[9px]">Zero publish</Badge>);
  } else if (src.counts.total >= 5 && src.counts.published / src.counts.total < 0.2) {
    badges.push(<Badge key="ly" variant="outline" className="text-[9px] text-warning border-warning/30">Low yield</Badge>);
  }

  if (src.trust_score >= 0.85) badges.push(<Badge key="tr" variant="outline" className="text-[9px] text-primary border-primary/20">★ High trust</Badge>);

  if ((src.sri_lanka_bias ?? 0) >= 0.7) badges.push(<Badge key="sl" variant="outline" className="text-[9px] border-primary/15">🇱🇰 Local</Badge>);

  return <>{badges}</>;
}

type SurfaceCoverageStatus = 'full' | 'partial' | 'fallback_only' | 'empty';

function getSurfaceCoverage(surfacesByCode: Record<string, any[]>, code: string): SurfaceCoverageStatus {
  const items = surfacesByCode[code];
  if (!items || items.length === 0) return 'fallback_only';
  const maxExpected: Record<string, number> = {
    homepage_hero: 3, homepage_hot_now: 8, homepage_did_you_know: 4,
    homepage_innovations: 4, homepage_safety: 3, homepage_numbers: 4,
    homepage_popular: 5, ai_banner_forum: 5, category_featured: 1, category_feed: 6,
  };
  if (items.length >= (maxExpected[code] ?? 4)) return 'full';
  return 'partial';
}

const COVERAGE_STYLES: Record<SurfaceCoverageStatus, string> = {
  full: 'text-primary', partial: 'text-warning', fallback_only: 'text-muted-foreground', empty: 'text-destructive',
};

const LANKAFIX_CATEGORIES = ['MOBILE', 'AC', 'IT', 'CCTV', 'SOLAR', 'CONSUMER_ELEC', 'SMART_HOME_OFFICE', 'ELECTRICAL', 'PLUMBING', 'NETWORK', 'POWER_BACKUP', 'HOME_SECURITY', 'APPLIANCE_INSTALL', 'COPIER', 'PRINT_SUPPLIES'];

export default function ContentIntelligenceOpsPage() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['content-ops'] });
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);

  // ─── Queries ───
  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['content-ops', 'queue'],
    queryFn: async () => {
      const { data } = await supabase.from('content_items')
        .select('*, content_ai_briefs(*), content_category_tags(*)')
        .in('status', ['new', 'needs_review', 'processed'])
        .order('created_at', { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: published, isLoading: pubLoading } = useQuery({
    queryKey: ['content-ops', 'published'],
    queryFn: async () => {
      const { data } = await supabase.from('content_items')
        .select('*, content_ai_briefs(*), content_category_tags(*)')
        .eq('status', 'published')
        .order('published_at', { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: sources, isLoading: srcLoading } = useQuery({
    queryKey: ['content-ops', 'sources'],
    queryFn: async () => {
      const { data: srcs } = await supabase.from('content_sources').select('*').order('trust_score', { ascending: false });
      if (!srcs?.length) return [];
      const ids = srcs.map((s: any) => s.id);
      const { data: items } = await supabase.from('content_items').select('source_id, status').in('source_id', ids);
      const countMap: Record<string, { published: number; rejected: number; archived: number; total: number; needs_review: number }> = {};
      (items ?? []).forEach((i: any) => {
        const c = countMap[i.source_id] ??= { published: 0, rejected: 0, archived: 0, total: 0, needs_review: 0 };
        c.total++;
        if (i.status === 'published') c.published++;
        if (i.status === 'rejected') c.rejected++;
        if (i.status === 'archived') c.archived++;
        if (i.status === 'needs_review') c.needs_review++;
      });
      return srcs.map((s: any) => ({ ...s, counts: countMap[s.id] ?? { published: 0, rejected: 0, archived: 0, total: 0, needs_review: 0 } }));
    },
  });

  const { data: surfaces } = useQuery({
    queryKey: ['content-ops', 'surfaces'],
    queryFn: async () => {
      const { data } = await supabase.from('content_surface_state')
        .select('*, content_items(title, content_type, status, freshness_score, source_name)')
        .eq('active', true).order('surface_code').order('rank_score', { ascending: false });
      return data ?? [];
    },
  });

  const { data: clusters } = useQuery({
    queryKey: ['content-ops', 'clusters'],
    queryFn: async () => {
      const { data } = await supabase.from('content_trend_clusters')
        .select('*').eq('active', true).order('momentum_score', { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['content-ops', 'analytics'],
    queryFn: async () => {
      const { data } = await supabase.from('content_events')
        .select('event_type, content_item_id').order('created_at', { ascending: false }).limit(500);
      const events = data ?? [];
      const byType: Record<string, number> = {};
      events.forEach((e: any) => { byType[e.event_type] = (byType[e.event_type] ?? 0) + 1; });
      return { total: events.length, ...byType };
    },
  });

  // Pipeline run history
  const { data: pipelineHistory } = useQuery({
    queryKey: ['content-ops', 'pipeline-history'],
    queryFn: async () => {
      const { data } = await supabase.from('pipeline_runs' as any)
        .select('*').order('started_at', { ascending: false }).limit(20);
      return (data ?? []) as any[];
    },
  });

  // Active alerts
  const { data: activeAlerts } = useQuery({
    queryKey: ['content-ops', 'alerts'],
    queryFn: async () => {
      const { data } = await supabase.from('content_alerts' as any)
        .select('*').is('resolved_at', null).order('created_at', { ascending: false }).limit(30);
      return (data ?? []) as any[];
    },
  });

  // Surface configs
  const { data: surfaceConfigs } = useQuery({
    queryKey: ['content-ops', 'surface-configs'],
    queryFn: async () => {
      const { data } = await supabase.from('content_surface_config' as any).select('*');
      return (data ?? []) as any[];
    },
  });

  // Aggregates
  const totalPublished = published?.length ?? 0;
  const totalSources = sources?.length ?? 0;
  const activeSources = sources?.filter((s: any) => s.active).length ?? 0;
  const disabledSources = sources?.filter((s: any) => !s.active).length ?? 0;
  const staleSources = sources?.filter((s: any) => {
    if (!s.active || !s.last_fetched_at) return s.active;
    return (Date.now() - new Date(s.last_fetched_at).getTime()) > 24 * 3600000;
  }).length ?? 0;
  const criticalSources = sources?.filter((s: any) => getSourceHealth(s) === 'critical').length ?? 0;
  const needsReview = queue?.filter((q: any) => q.status === 'needs_review').length ?? 0;
  const totalRejected = sources?.reduce((s: number, src: any) => s + (src.counts?.rejected ?? 0), 0) ?? 0;
  const totalArchived = sources?.reduce((s: number, src: any) => s + (src.counts?.archived ?? 0), 0) ?? 0;
  const totalFetched = sources?.reduce((s: number, src: any) => s + (src.counts?.total ?? 0), 0) ?? 0;
  const backlog = queue?.length ?? 0;
  const publishRate = totalFetched > 0 ? Math.round((totalPublished / totalFetched) * 100) : 0;
  const rejectRate = totalFetched > 0 ? Math.round((totalRejected / totalFetched) * 100) : 0;
  const tier1Count = sources?.filter((s: any) => classifySourceTier(s) === 'tier1_safe').length ?? 0;
  const tier2Count = sources?.filter((s: any) => classifySourceTier(s) === 'tier2_controlled').length ?? 0;
  const tier3Count = sources?.filter((s: any) => classifySourceTier(s) === 'tier3_experimental').length ?? 0;
  const readySources = sources?.filter((s: any) => s.active && s.base_url).length ?? 0;
  const needsUrlSources = sources?.filter((s: any) => s.active && !s.base_url).length ?? 0;

  const surfacesByCode = useMemo(() => {
    const map: Record<string, any[]> = {};
    (surfaces ?? []).forEach((s: any) => { (map[s.surface_code] ??= []).push(s); });
    return map;
  }, [surfaces]);

  const REQUIRED_SURFACES = ['homepage_hero', 'homepage_hot_now', 'homepage_did_you_know', 'homepage_innovations', 'homepage_safety', 'homepage_numbers', 'homepage_popular', 'ai_banner_forum', 'category_featured', 'category_feed'];
  const coveredSurfaces = REQUIRED_SURFACES.filter(s => (surfacesByCode[s]?.length ?? 0) > 0).length;
  const surfaceCoverage = Math.round((coveredSurfaces / REQUIRED_SURFACES.length) * 100);

  const categoryCoverage = useMemo(() => {
    const catData: Record<string, { featured: number; feed: number; live: number; evergreen: number }> = {};
    LANKAFIX_CATEGORIES.forEach(c => { catData[c] = { featured: 0, feed: 0, live: 0, evergreen: 0 }; });
    (surfaces ?? []).forEach((s: any) => {
      if (!s.category_code || !catData[s.category_code]) return;
      if (s.surface_code === 'category_featured') catData[s.category_code].featured++;
      if (s.surface_code === 'category_feed') catData[s.category_code].feed++;
      catData[s.category_code].live++;
    });
    return catData;
  }, [surfaces]);

  const surfaceConfigMap = useMemo(() => {
    const m: Record<string, any> = {};
    (surfaceConfigs ?? []).forEach((c: any) => { m[c.surface_code] = c; });
    return m;
  }, [surfaceConfigs]);

  // ─── Mutations ───
  const ingestMutation = useMutation({
    mutationFn: async ({ mode, tierLimit }: { mode: string; tierLimit?: string }) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', {
        body: { mode, tier_limit: tierLimit },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setLastRunResult({ ...data, timestamp: new Date().toISOString() });
      if (data.mode === 'dry_run' || data.mode === 'publish_preview') {
        setPreviewResult(data.preview);
        toast.success('Preview generated');
      } else if (data.mode === 'validate_sources') {
        toast.success(`Validated ${data.sources?.length ?? 0} sources`);
      } else {
        toast.success(`Pipeline complete (${data.mode})`);
      }
      invalidateAll();
    },
    onError: (e) => toast.error(`Pipeline failed: ${(e as Error).message}`),
  });

  const editorialAction = useMutation({
    mutationFn: async ({ itemId, action }: { itemId: string; action: string }) => {
      const statusMap: Record<string, string> = { approve: 'published', reject: 'rejected', archive: 'archived' };
      const newStatus = statusMap[action];
      if (newStatus) await supabase.from('content_items').update({ status: newStatus }).eq('id', itemId);
      if (action === 'pin_hero') {
        await supabase.from('content_surface_state').update({ active: false }).eq('surface_code', 'homepage_hero').eq('active', true).lt('rank_score', 990);
        await supabase.from('content_surface_state').insert({ surface_code: 'homepage_hero', content_item_id: itemId, rank_score: 999, active: true });
      }
      if (action === 'suppress') {
        await supabase.from('content_items').update({ status: 'rejected', rejection_reason: 'ops_suppressed' }).eq('id', itemId);
        await supabase.from('content_surface_state').update({ active: false }).eq('content_item_id', itemId);
      }
      if (action === 'boost') {
        const { data: currentSurfaces } = await supabase.from('content_surface_state')
          .select('id, rank_score').eq('content_item_id', itemId).eq('active', true).lt('rank_score', 990);
        for (const surf of currentSurfaces ?? []) {
          const newRank = Math.min(989, (surf.rank_score ?? 50) + 15);
          await supabase.from('content_surface_state').update({ rank_score: newRank }).eq('id', surf.id);
        }
      }
      await supabase.from('content_editorial_actions').insert({ content_item_id: itemId, action_type: action });
    },
    onSuccess: () => { toast.success('Action applied'); invalidateAll(); },
    onError: () => toast.error('Action failed'),
  });

  const toggleSource = useMutation({
    mutationFn: async ({ sourceId, active }: { sourceId: string; active: boolean }) => {
      await supabase.from('content_sources').update({ active }).eq('id', sourceId);
    },
    onSuccess: () => { toast.success('Source updated'); invalidateAll(); },
  });

  const quarantineSource = useMutation({
    mutationFn: async ({ sourceId, quarantine }: { sourceId: string; quarantine: boolean }) => {
      await supabase.from('content_sources').update({
        rollout_state: quarantine ? 'quarantined' : 'validated',
      }).eq('id', sourceId);
    },
    onSuccess: () => { toast.success('Source rollout state updated'); invalidateAll(); },
  });

  const promoteSource = useMutation({
    mutationFn: async ({ sourceId, targetState }: { sourceId: string; targetState: string }) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', {
        body: { mode: 'promote_source', source_id: sourceId, target_state: targetState },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => { toast.success(`Source promoted: ${data.from} → ${data.to}`); invalidateAll(); },
    onError: (e) => toast.error(`Promotion failed: ${(e as Error).message}`),
  });

  const rollbackPublish = useMutation({
    mutationFn: async (surfaceCode?: string) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', {
        body: { mode: 'rollback', surface_code: surfaceCode },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { toast.success(`Rolled back ${data.rolled_back} surface assignments`); invalidateAll(); },
    onError: (e) => toast.error(`Rollback failed: ${(e as Error).message}`),
  });

  const updateSurfaceRollout = useMutation({
    mutationFn: async ({ surfaceCode, mode }: { surfaceCode: string; mode: string }) => {
      await supabase.from('content_surface_config' as any).update({
        rollout_mode: mode, updated_at: new Date().toISOString(),
      }).eq('surface_code', surfaceCode);
    },
    onSuccess: () => { toast.success('Surface rollout updated'); invalidateAll(); },
  });

  const freezeSurface = useMutation({
    mutationFn: async ({ surfaceCode, freeze }: { surfaceCode: string; freeze: boolean }) => {
      await supabase.from('content_surface_config' as any).update({
        frozen: freeze,
        frozen_at: freeze ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('surface_code', surfaceCode);
    },
    onSuccess: () => { toast.success('Surface freeze updated'); invalidateAll(); },
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      await supabase.from('content_alerts' as any).update({
        acknowledged_at: new Date().toISOString(),
      }).eq('id', alertId);
    },
    onSuccess: () => { toast.success('Alert acknowledged'); invalidateAll(); },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      await supabase.from('content_alerts' as any).update({
        resolved_at: new Date().toISOString(),
      }).eq('id', alertId);
    },
    onSuccess: () => { toast.success('Alert resolved'); invalidateAll(); },
  });

  const reBriefMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase.from('content_ai_briefs').delete().eq('content_item_id', itemId);
      await supabase.from('content_items').update({ status: 'new' }).eq('id', itemId);
      const { error } = await supabase.functions.invoke('content-ingest', { body: { mode: 'brief' } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Re-briefed'); invalidateAll(); },
    onError: () => toast.error('Re-brief failed'),
  });

  const isPending = ingestMutation.isPending || editorialAction.isPending || reBriefMutation.isPending;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-xl font-bold flex items-center gap-2">
              Content Intelligence
              {totalPublished > 0 && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  <Radio className="h-2.5 w-2.5 mr-1 text-primary" /> Live
                </Badge>
              )}
              {(activeAlerts?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  <Bell className="h-2.5 w-2.5 mr-1" /> {activeAlerts?.length} alerts
                </Badge>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {staleSources > 0 && <span className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {staleSources} stale</span>}
              {criticalSources > 0 && <span className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> {criticalSources} critical</span>}
              {needsUrlSources > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1">{needsUrlSources} need URL</span>}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => ingestMutation.mutate({ mode: 'dry_run' })} disabled={isPending}>
              <Search className="h-3.5 w-3.5 mr-1" /> Preview
            </Button>
            <Button size="sm" variant="outline" onClick={() => ingestMutation.mutate({ mode: 'validate_sources' })} disabled={isPending}>
              <Shield className="h-3.5 w-3.5 mr-1" /> Validate
            </Button>
            <Button size="sm" onClick={() => ingestMutation.mutate({ mode: 'full' })} disabled={isPending}>
              {ingestMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
              Full Run
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => rollbackPublish.mutate(undefined)} disabled={isPending || rollbackPublish.isPending}>
              <RotateCw className="h-3.5 w-3.5 mr-1" /> Rollback
            </Button>
          </div>
        </div>

        {/* Granular pipeline controls */}
        <div className="flex gap-1 mb-3 flex-wrap">
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => ingestMutation.mutate({ mode: 'fetch_only' })} disabled={isPending}>
            <Database className="h-3 w-3 mr-1" /> Fetch
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => ingestMutation.mutate({ mode: 'brief' })} disabled={isPending}>
            <FileText className="h-3 w-3 mr-1" /> Brief
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => ingestMutation.mutate({ mode: 'rescue_review' })} disabled={isPending}>
            <Star className="h-3 w-3 mr-1" /> Rescue
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => ingestMutation.mutate({ mode: 'publish' })} disabled={isPending}>
            <Layers className="h-3 w-3 mr-1" /> Publish
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => ingestMutation.mutate({ mode: 'decay' })} disabled={isPending}>
            <Timer className="h-3 w-3 mr-1" /> Decay
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => ingestMutation.mutate({ mode: 'cluster' })} disabled={isPending}>
            <TrendingUp className="h-3 w-3 mr-1" /> Cluster
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-primary font-semibold" onClick={() => ingestMutation.mutate({ mode: 'backlog_burn' })} disabled={isPending}>
            <Zap className="h-3 w-3 mr-1" /> Burn Backlog
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => ingestMutation.mutate({ mode: 'ingest', tierLimit: 'tier1' })} disabled={isPending}>
            <Gauge className="h-3 w-3 mr-1" /> Tier 1
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => ingestMutation.mutate({ mode: 'ingest', tierLimit: 'tier2' })} disabled={isPending}>
            <Gauge className="h-3 w-3 mr-1" /> Tier 1+2
          </Button>
        </div>

        {/* Active alerts banner */}
        {(activeAlerts?.length ?? 0) > 0 && (
          <Card className="p-3 mb-3 border-destructive/20 bg-destructive/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <span className="text-xs font-bold">Active Alerts ({activeAlerts?.length})</span>
            </div>
            <div className="space-y-1.5">
              {(activeAlerts ?? []).slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-[8px] shrink-0">{alert.severity}</Badge>
                    <span className="truncate">{alert.title}</span>
                    <span className="text-muted-foreground shrink-0">{formatTimeAgo(alert.created_at)}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!alert.acknowledged_at && (
                      <Button size="sm" variant="ghost" className="h-5 text-[8px] px-1.5" onClick={() => acknowledgeAlert.mutate(alert.id)}>Ack</Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-5 text-[8px] px-1.5" onClick={() => resolveAlert.mutate(alert.id)}>Resolve</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Last Pipeline Run */}
        {lastRunResult && (
          <Card className="p-3 mb-3 border-primary/20 bg-primary/[0.02]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Last Run: <Badge variant="outline" className="text-[9px]">{lastRunResult.mode}</Badge>
              </span>
              <span className="text-[10px] text-muted-foreground">{lastRunResult.duration_ms}ms · {formatTimeAgo(lastRunResult.timestamp)}</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-[10px]">
              <div>Fetched: <strong>{lastRunResult.fetched ?? 0}</strong></div>
              <div>Deduped: <strong>{lastRunResult.deduped ?? 0}</strong></div>
              <div>Briefed: <strong>{lastRunResult.briefed ?? 0}</strong></div>
              <div>Published: <strong className="text-primary">{lastRunResult.published ?? 0}</strong></div>
              <div>Rejected: <strong className="text-destructive">{lastRunResult.rejected ?? 0}</strong></div>
            </div>
            {(lastRunResult.title_rejected ?? 0) > 0 && (
              <p className="text-[10px] text-warning mt-1">⚠ {lastRunResult.title_rejected} titles rejected</p>
            )}
            {lastRunResult.source_errors?.length > 0 && (
              <div className="mt-1.5 text-[10px] text-destructive">
                {lastRunResult.source_errors.slice(0, 3).map((e: string, i: number) => <p key={i}>⚠ {e}</p>)}
              </div>
            )}
          </Card>
        )}

        {/* Preview Result */}
        {previewResult && (
          <Card className="p-3 mb-3 border-accent/20 bg-accent/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-accent-foreground" /> Publish Preview
              </span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setPreviewResult(null)}>Dismiss</Button>
            </div>
            {Object.entries(previewResult).length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No published content. Evergreen fallback active.</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(previewResult).slice(0, 15).map(([surface, items]) => (
                  <div key={surface}>
                    <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{surface.replace(/_/g, ' ')}</p>
                    {(items as any[]).length === 0 ? (
                      <p className="text-[9px] text-muted-foreground/60 italic">Fallback only</p>
                    ) : (
                      (items as any[]).map((item: any, i: number) => (
                        <div key={i} className="ml-2 mb-1 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground w-3 text-right shrink-0">{i + 1}.</span>
                            <span className="truncate flex-1 font-medium">{item.title}</span>
                            <Badge variant="outline" className="text-[8px] shrink-0">{item.relevance_band?.replace(/_/g, ' ') ?? '—'}</Badge>
                            <span className="text-[9px] text-muted-foreground shrink-0 font-mono">{item.rank}</span>
                          </div>
                          <div className="ml-5 flex items-center gap-2 text-[9px] text-muted-foreground/70">
                            <span>Q:{item.quality}</span>
                            <span>F:{item.freshness}</span>
                            <span>LU:{item.local_utility}</span>
                            <span>{item.source_name}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Executive Metrics */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <StatCard label="Published" value={totalPublished} icon={Eye} color="text-primary" subtitle={`${publishRate}% rate`} />
          <StatCard label="Review" value={needsReview} icon={AlertTriangle} color="text-warning" subtitle={`${backlog} backlog`} />
          <StatCard label="Rejected" value={totalRejected} icon={XCircle} color="text-destructive" subtitle={`${rejectRate}% rate`} />
          <StatCard label="Alerts" value={activeAlerts?.length ?? 0} icon={Bell} color="text-destructive" />
        </div>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <StatCard label="Sources" value={`${readySources}/${totalSources}`} icon={Layers} color="text-accent-foreground" subtitle={`T1:${tier1Count} T2:${tier2Count} T3:${tier3Count}`} />
          <StatCard label="Coverage" value={`${surfaceCoverage}%`} icon={Radio} color="text-primary" subtitle={`${coveredSurfaces}/${REQUIRED_SURFACES.length}`} />
          <StatCard label="Clusters" value={clusters?.length ?? 0} icon={TrendingUp} color="text-accent-foreground" />
          <StatCard label="Runs" value={pipelineHistory?.length ?? 0} icon={History} color="text-muted-foreground" subtitle={pipelineHistory?.[0] ? formatTimeAgo(pipelineHistory[0].started_at) : 'None'} />
        </div>
        {/* Live vs Evergreen + SL Relevance metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard
            label="Live Fill"
            value={`${(surfaces ?? []).length}`}
            icon={Radio}
            color="text-primary"
            subtitle={`${coveredSurfaces} surfaces active`}
          />
          <StatCard
            label="SL Sources"
            value={sources?.filter((s: any) => (s.sri_lanka_bias ?? 0) >= 0.7 && s.active).length ?? 0}
            icon={Shield}
            color="text-primary"
            subtitle={`of ${activeSources} active`}
          />
          <StatCard
            label="Avg Quality"
            value={((published ?? []).reduce((sum: number, p: any) => sum + (p.content_ai_briefs?.[0]?.ai_quality_score ?? 0), 0) / Math.max(1, totalPublished)).toFixed(2)}
            icon={Star}
            color="text-accent-foreground"
            subtitle="published items"
          />
        </div>

        <Tabs defaultValue="queue">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="queue">Queue ({queue?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="clusters">Trends</TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="space-y-2 mt-3">
            {queueLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading…</p>}
            {!queueLoading && !queue?.length && <EmptyState message="No items in queue — run pipeline to ingest content" icon={CheckCircle} />}
            {(queue ?? []).map((item: any) => {
              const brief = item.content_ai_briefs?.[0];
              const quality = brief?.ai_quality_score;
              return (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                        <Badge variant={item.status === 'needs_review' ? 'destructive' : 'outline'} className="text-[10px]">{item.status}</Badge>
                        {item.content_category_tags?.slice(0, 2).map((t: any) => (
                          <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
                        ))}
                        {item.source_country === 'lk' && <span className="text-[9px]">🇱🇰</span>}
                      </div>
                      <p className="text-sm font-semibold line-clamp-1">{brief?.ai_headline ?? item.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Q: <strong className={quality >= 0.6 ? 'text-primary' : quality >= 0.3 ? 'text-warning' : 'text-destructive'}>{quality?.toFixed(2) ?? 'N/A'}</strong></span>
                        <span>{item.source_name ?? '—'}</span>
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatTimeAgo(item.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'approve' })} title="Approve">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'reject' })} title="Reject">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending || reBriefMutation.isPending}
                        onClick={() => reBriefMutation.mutate(item.id)} title="Re-brief">
                        <RotateCw className={`h-3.5 w-3.5 text-muted-foreground ${reBriefMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Published Tab */}
          <TabsContent value="published" className="space-y-2 mt-3">
            {pubLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading…</p>}
            {!pubLoading && !published?.length && <EmptyState message="No published items yet" icon={Eye} />}
            {(published ?? []).map((item: any) => {
              const brief = item.content_ai_briefs?.[0];
              return (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                        {item.content_category_tags?.slice(0, 2).map((t: any) => (
                          <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
                        ))}
                        {item.source_country === 'lk' && <span className="text-[9px]">🇱🇰</span>}
                      </div>
                      <p className="text-sm font-semibold line-clamp-1">{brief?.ai_headline ?? item.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Fresh: {item.freshness_score ?? 0}</span>
                        <span>Q: {brief?.ai_quality_score?.toFixed(2) ?? '—'}</span>
                        <span>{item.source_name ?? 'LankaFix'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'pin_hero' })} title="Pin Hero">
                        <Pin className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'boost' })} title="Boost">
                        <ChevronUp className="h-3.5 w-3.5 text-accent-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                        onClick={() => editorialAction.mutate({ itemId: item.id, action: 'suppress' })} title="Suppress">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="space-y-2 mt-3">
            {srcLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading…</p>}
            {(sources ?? []).map((src: any) => {
              const health = getSourceHealth(src);
              return (
                <Card key={src.id} className={`p-3 ${HEALTH_STYLES[health]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[health]}`} />
                        <span className="text-sm font-semibold truncate">{src.source_name}</span>
                        <span className="text-[10px] text-muted-foreground">{src.source_type}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        <SourceHealthBadges src={src} />
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-[10px] text-muted-foreground">
                        <span>Total: {src.counts.total}</span>
                        <span className="text-primary">Pub: {src.counts.published}</span>
                        <span className="text-destructive">Rej: {src.counts.rejected}</span>
                        <span>Trust: {src.trust_score?.toFixed(2)}</span>
                        <span>SL: {(src.sri_lanka_bias ?? 0).toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-6 text-[9px]"
                        onClick={() => toggleSource.mutate({ sourceId: src.id, active: !src.active })}>
                        {src.active ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        {src.active ? 'Disable' : 'Enable'}
                      </Button>
                      {src.active && (
                        <>
                          <Button size="sm" variant="ghost" className="h-6 text-[9px]"
                            onClick={() => quarantineSource.mutate({
                              sourceId: src.id,
                              quarantine: src.rollout_state !== 'quarantined',
                            })}>
                            {src.rollout_state === 'quarantined' ? (
                              <><Unlock className="h-3 w-3 mr-1" /> Unquarantine</>
                            ) : (
                              <><Lock className="h-3 w-3 mr-1 text-destructive" /> Quarantine</>
                            )}
                          </Button>
                          {/* Promotion controls */}
                          {SOURCE_ROLLOUT_TRANSITIONS[src.rollout_state ?? 'inactive']?.filter(s => s !== 'quarantined' && s !== 'inactive').map(target => (
                            <Button key={target} size="sm" variant="ghost" className="h-6 text-[9px] text-primary"
                              disabled={promoteSource.isPending}
                              onClick={() => promoteSource.mutate({ sourceId: src.id, targetState: target })}>
                              <ChevronUp className="h-3 w-3 mr-1" /> → {target.replace(/_/g, ' ')}
                            </Button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Surfaces Tab — with rollout controls */}
          <TabsContent value="surfaces" className="space-y-2 mt-3">
            {REQUIRED_SURFACES.map(code => {
              const items = surfacesByCode[code] ?? [];
              const status = getSurfaceCoverage(surfacesByCode, code);
              const config = surfaceConfigMap[code];
              return (
                <Card key={code} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${COVERAGE_STYLES[status]}`}>{code.replace(/_/g, ' ')}</span>
                      <Badge variant="outline" className={`text-[9px] ${COVERAGE_STYLES[status]}`}>{status.replace(/_/g, ' ')}</Badge>
                      {config?.frozen && <Badge variant="destructive" className="text-[8px]"><Lock className="h-2 w-2 mr-0.5" /> Frozen</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        className="text-[9px] bg-transparent border border-border rounded px-1 py-0.5"
                        value={config?.rollout_mode ?? 'evergreen_only'}
                        onChange={(e) => updateSurfaceRollout.mutate({ surfaceCode: code, mode: e.target.value })}
                      >
                        {SURFACE_ROLLOUT_MODES.map(m => (
                          <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="ghost" className="h-6 text-[9px]"
                        onClick={() => freezeSurface.mutate({ surfaceCode: code, freeze: !config?.frozen })}>
                        {config?.frozen ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {items.length === 0 ? (
                      <p>No live items. Evergreen fallback active.</p>
                    ) : (
                      items.slice(0, 3).map((s: any) => (
                        <p key={s.id} className="truncate">
                          #{Math.round(s.rank_score ?? 0)} · {(s as any).content_items?.title ?? '—'}
                          {s.rank_score >= 990 && <span className="text-primary ml-1">📌 Pinned</span>}
                        </p>
                      ))
                    )}
                    {items.length > 3 && <p className="text-muted-foreground/50">+{items.length - 3} more</p>}
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="categories" className="space-y-2 mt-3">
            {LANKAFIX_CATEGORIES.map(cat => {
              const data = categoryCoverage[cat] ?? { featured: 0, feed: 0, live: 0, evergreen: 0 };
              const readiness = getCategoryReadiness(data);
              const readinessStyle = READINESS_STYLES[readiness];
              return (
                <Card key={cat} className={`p-2.5 ${readiness === 'blocked' ? 'border-destructive/15' : readiness === 'weak' ? 'border-warning/15' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{cat}</span>
                      <Badge variant="outline" className={`text-[8px] ${readinessStyle.color}`}>{readinessStyle.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span>Featured: <strong className={data.featured ? 'text-primary' : 'text-muted-foreground'}>{data.featured}</strong></span>
                      <span>Feed: <strong className={data.feed ? 'text-primary' : 'text-muted-foreground'}>{data.feed}</strong></span>
                      <span>Live: <strong>{data.live}</strong></span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Pipeline History Tab */}
          <TabsContent value="history" className="space-y-2 mt-3">
            {!pipelineHistory?.length && <EmptyState message="No pipeline runs yet" icon={History} />}
            {(pipelineHistory ?? []).map((run: any) => (
              <Card key={run.id} className={`p-3 ${run.status === 'failed' ? 'border-destructive/20' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={run.status === 'failed' ? 'destructive' : run.status === 'running' ? 'secondary' : 'outline'} className="text-[9px]">
                      {run.status}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">{run.mode}</Badge>
                    <span className="text-[10px] text-muted-foreground">{run.triggered_by}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {run.duration_ms ? `${run.duration_ms}ms` : '—'} · {formatTimeAgo(run.started_at)}
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1.5 text-[10px]">
                  <span>Fetch: {run.fetched ?? 0}</span>
                  <span>Brief: {run.briefed ?? 0}</span>
                  <span className="text-primary">Pub: {run.published ?? 0}</span>
                  <span className="text-destructive">Rej: {run.rejected ?? 0}</span>
                  <span>Decay: {run.decayed ?? 0}</span>
                  <span>Err: {run.errors_count ?? 0}</span>
                </div>
                {run.error_details?.length > 0 && (
                  <div className="mt-1 text-[9px] text-destructive">
                    {run.error_details.slice(0, 2).map((e: string, i: number) => <p key={i}>⚠ {e}</p>)}
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="clusters" className="space-y-2 mt-3">
            {!clusters?.length && <EmptyState message="No trend clusters detected yet" icon={TrendingUp} />}
            {(clusters ?? []).map((c: any) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{c.cluster_label}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      {c.category_code && <Badge variant="outline" className="text-[9px]">{c.category_code}</Badge>}
                      <span>{c.content_count} items</span>
                      <span>SL: {c.sri_lanka_relevance_score}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{c.momentum_score}</p>
                    <p className="text-[10px] text-muted-foreground">momentum</p>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </PageTransition>
  );
}
