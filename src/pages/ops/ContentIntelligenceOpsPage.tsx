/* Content Intelligence Ops v11 — Executive-grade dashboard with premium readiness, SL metrics, source perf */
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
  Bell, ShieldAlert, Lock, Unlock, History, ArrowUpRight, Globe, Image
} from 'lucide-react';

// ─── Utility components ───
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

// ─── Health / Readiness classifiers ───
type SourceHealth = 'healthy' | 'warning' | 'critical' | 'disabled';

function getSourceHealth(src: any): SourceHealth {
  if (!src.active) return 'disabled';
  if (src.rollout_state === 'quarantined') return 'critical';
  const rejectRate = src.counts.total > 0 ? src.counts.rejected / src.counts.total : 0;
  const publishRate = src.counts.total > 0 ? src.counts.published / src.counts.total : 0;
  const isStale = src.last_fetched_at && (Date.now() - new Date(src.last_fetched_at).getTime()) > 24 * 3600000;
  const neverFetched = src.active && !src.last_fetched_at;
  if ((src.counts.total >= 5 && src.counts.published === 0) || (src.counts.total >= 5 && rejectRate > 0.5) || (isStale && src.counts.total > 0)) return 'critical';
  if ((src.counts.total >= 5 && publishRate < 0.2) || isStale || neverFetched) return 'warning';
  return 'healthy';
}

const HEALTH_DOT: Record<SourceHealth, string> = { healthy: 'bg-primary', warning: 'bg-warning', critical: 'bg-destructive', disabled: 'bg-muted-foreground' };
const HEALTH_STYLES: Record<SourceHealth, string> = {
  healthy: 'border-primary/30', warning: 'border-warning/40 bg-warning/3',
  critical: 'border-destructive/30 bg-destructive/3', disabled: 'border-muted/40 bg-muted/5 opacity-60',
};

type CategoryReadiness = 'ready' | 'weak' | 'fallback_only' | 'blocked';
function getCategoryReadiness(data: { featured: number; feed: number; live: number }): CategoryReadiness {
  if (data.live >= 3 && data.featured >= 1) return 'ready';
  if (data.live >= 1) return 'weak';
  return 'fallback_only';
}
const READINESS_STYLES: Record<CategoryReadiness, { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'text-primary border-primary/20 bg-primary/5' },
  weak: { label: 'Weak', color: 'text-warning border-warning/20 bg-warning/5' },
  fallback_only: { label: 'Fallback', color: 'text-muted-foreground border-muted' },
  blocked: { label: 'Blocked', color: 'text-destructive border-destructive/20 bg-destructive/5' },
};

type PremiumReadiness = 'strong' | 'acceptable' | 'weak' | 'empty';
function getPremiumReadiness(live: number, sl: number, avgQ: number): PremiumReadiness {
  if (live >= 3 && avgQ >= 0.55 && sl >= 1) return 'strong';
  if (live >= 2 && avgQ >= 0.45) return 'acceptable';
  if (live >= 1) return 'weak';
  return 'empty';
}
const PREMIUM_READINESS_STYLES: Record<PremiumReadiness, { label: string; color: string; dot: string }> = {
  strong: { label: '● Strong', color: 'text-primary', dot: 'bg-primary' },
  acceptable: { label: '● Acceptable', color: 'text-accent-foreground', dot: 'bg-accent-foreground' },
  weak: { label: '● Weak', color: 'text-warning', dot: 'bg-warning' },
  empty: { label: '○ Empty', color: 'text-destructive', dot: 'bg-destructive' },
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
  inactive: ['validated'], validated: ['pilot_live', 'inactive'],
  pilot_live: ['production_live', 'validated', 'quarantined'],
  production_live: ['quarantined', 'pilot_live'],
  failing: ['quarantined', 'validated', 'inactive'],
  quarantined: ['validated', 'inactive'],
};
function classifySourceTier(src: any): string {
  if (src.trust_score >= 0.8 && src.base_url) return 'tier1_safe';
  if (src.trust_score >= 0.7 && src.base_url) return 'tier2_controlled';
  return 'tier3_experimental';
}
const TIER_LABELS: Record<string, { label: string; color: string }> = {
  tier1_safe: { label: 'Tier 1', color: 'text-primary border-primary/20 bg-primary/5' },
  tier2_controlled: { label: 'Tier 2', color: 'text-accent-foreground border-accent/20 bg-accent/5' },
  tier3_experimental: { label: 'Tier 3', color: 'text-warning border-warning/20 bg-warning/5' },
};

function SourceHealthBadges({ src }: { src: any }) {
  const badges: React.ReactNode[] = [];
  if (!src.active) { badges.push(<Badge key="dis" variant="secondary" className="text-[9px]">Disabled</Badge>); return <>{badges}</>; }
  const tier = classifySourceTier(src);
  const tierInfo = TIER_LABELS[tier];
  if (tierInfo) badges.push(<Badge key="tier" variant="outline" className={`text-[9px] ${tierInfo.color}`}>{tierInfo.label}</Badge>);
  const rolloutInfo = ROLLOUT_STATE_LABELS[src.rollout_state ?? 'inactive'];
  if (rolloutInfo) badges.push(<Badge key="rs" variant="outline" className={`text-[9px] ${rolloutInfo.color}`}>{rolloutInfo.label}</Badge>);
  if (!src.base_url) badges.push(<Badge key="nu" variant="outline" className="text-[9px] text-warning border-warning/30">No URL</Badge>);
  const isND = src.base_url?.includes('newsdata.io');
  if (isND && src.rollout_state === 'failing') badges.push(<Badge key="bl" variant="destructive" className="text-[9px]">🔑 Blocked</Badge>);
  if (!src.last_fetched_at) badges.push(<Badge key="nf" variant="outline" className="text-[9px] text-warning border-warning/30">Never fetched</Badge>);
  else {
    const hrs = (Date.now() - new Date(src.last_fetched_at).getTime()) / 3600000;
    if (hrs > 24) badges.push(<Badge key="st" variant="destructive" className="text-[9px]">Stale ({Math.floor(hrs)}h)</Badge>);
    else badges.push(<Badge key="ok" variant="outline" className="text-[9px] text-primary border-primary/30">{formatTimeAgo(src.last_fetched_at)}</Badge>);
  }
  if (src.trust_score >= 0.85) badges.push(<Badge key="tr" variant="outline" className="text-[9px] text-primary border-primary/20">★ High trust</Badge>);
  if ((src.sri_lanka_bias ?? 0) >= 0.7) badges.push(<Badge key="sl" variant="outline" className="text-[9px] border-primary/15">🇱🇰 Local</Badge>);
  const publishRate = src.counts.total >= 5 ? src.counts.published / src.counts.total : null;
  if (publishRate !== null && publishRate < 0.2) badges.push(<Badge key="ly" variant="outline" className="text-[9px] text-warning border-warning/30">Low yield</Badge>);
  return <>{badges}</>;
}

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
        .order('published_at', { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  const { data: sources, isLoading: srcLoading } = useQuery({
    queryKey: ['content-ops', 'sources'],
    queryFn: async () => {
      const { data: srcs } = await supabase.from('content_sources').select('*').order('trust_score', { ascending: false });
      if (!srcs?.length) return [];
      const ids = srcs.map((s: any) => s.id);
      const { data: items } = await supabase.from('content_items').select('source_id, status, image_url, source_country').in('source_id', ids);
      const countMap: Record<string, { published: number; rejected: number; total: number; needs_review: number; sl: number; withImage: number }> = {};
      (items ?? []).forEach((i: any) => {
        const c = countMap[i.source_id] ??= { published: 0, rejected: 0, total: 0, needs_review: 0, sl: 0, withImage: 0 };
        c.total++;
        if (i.status === 'published') c.published++;
        if (i.status === 'rejected') c.rejected++;
        if (i.status === 'needs_review') c.needs_review++;
        if (i.source_country === 'lk') c.sl++;
        if (i.image_url) c.withImage++;
      });
      return srcs.map((s: any) => ({ ...s, counts: countMap[s.id] ?? { published: 0, rejected: 0, total: 0, needs_review: 0, sl: 0, withImage: 0 } }));
    },
  });
  const { data: surfaces } = useQuery({
    queryKey: ['content-ops', 'surfaces'],
    queryFn: async () => {
      const { data } = await supabase.from('content_surface_state')
        .select('*, content_items(title, content_type, status, freshness_score, source_name, source_country, image_url)')
        .eq('active', true).order('surface_code').order('rank_score', { ascending: false });
      return data ?? [];
    },
  });
  const { data: clusters } = useQuery({
    queryKey: ['content-ops', 'clusters'],
    queryFn: async () => {
      const { data } = await supabase.from('content_trend_clusters').select('*').eq('active', true).order('momentum_score', { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  const { data: pipelineHistory } = useQuery({
    queryKey: ['content-ops', 'pipeline-history'],
    queryFn: async () => {
      const { data } = await supabase.from('pipeline_runs' as any).select('*').order('started_at', { ascending: false }).limit(20);
      return (data ?? []) as any[];
    },
  });
  const { data: activeAlerts } = useQuery({
    queryKey: ['content-ops', 'alerts'],
    queryFn: async () => {
      const { data } = await supabase.from('content_alerts' as any).select('*').is('resolved_at', null).order('created_at', { ascending: false }).limit(30);
      return (data ?? []) as any[];
    },
  });
  const { data: surfaceConfigs } = useQuery({
    queryKey: ['content-ops', 'surface-configs'],
    queryFn: async () => {
      const { data } = await supabase.from('content_surface_config' as any).select('*');
      return (data ?? []) as any[];
    },
  });

  // ─── Aggregates ───
  const totalPublished = published?.length ?? 0;
  const slPublished = published?.filter((p: any) => p.source_country === 'lk').length ?? 0;
  const totalSources = sources?.length ?? 0;
  const activeSources = sources?.filter((s: any) => s.active).length ?? 0;
  const criticalSources = sources?.filter((s: any) => getSourceHealth(s) === 'critical').length ?? 0;
  const needsReview = queue?.filter((q: any) => q.status === 'needs_review').length ?? 0;
  const totalFetched = sources?.reduce((s: number, src: any) => s + (src.counts?.total ?? 0), 0) ?? 0;
  const backlog = queue?.length ?? 0;
  const publishRate = totalFetched > 0 ? Math.round((totalPublished / totalFetched) * 100) : 0;
  const avgQuality = totalPublished > 0
    ? ((published ?? []).reduce((s: number, p: any) => s + (p.content_ai_briefs?.[0]?.ai_quality_score ?? 0), 0) / totalPublished)
    : 0;
  const slShare = totalPublished > 0 ? Math.round(slPublished / totalPublished * 100) : 0;
  const blockedNewsdata = sources?.filter((s: any) => s.base_url?.includes('newsdata.io') && s.rollout_state === 'failing').length ?? 0;

  const surfacesByCode = useMemo(() => {
    const map: Record<string, any[]> = {};
    (surfaces ?? []).forEach((s: any) => { (map[s.surface_code] ??= []).push(s); });
    return map;
  }, [surfaces]);

  const REQUIRED_SURFACES = ['homepage_hero', 'homepage_hot_now', 'homepage_did_you_know', 'homepage_innovations', 'homepage_safety', 'homepage_numbers', 'homepage_popular', 'ai_banner_forum', 'category_featured', 'category_feed'];
  const coveredSurfaces = REQUIRED_SURFACES.filter(s => (surfacesByCode[s]?.length ?? 0) > 0).length;

  const surfaceConfigMap = useMemo(() => {
    const m: Record<string, any> = {};
    (surfaceConfigs ?? []).forEach((c: any) => { m[c.surface_code] = c; });
    return m;
  }, [surfaceConfigs]);

  const categoryCoverage = useMemo(() => {
    const catData: Record<string, { featured: number; feed: number; live: number; sl: number; avgQ: number }> = {};
    LANKAFIX_CATEGORIES.forEach(c => { catData[c] = { featured: 0, feed: 0, live: 0, sl: 0, avgQ: 0 }; });
    // Count surface assignments
    (surfaces ?? []).forEach((s: any) => {
      if (!s.category_code || !catData[s.category_code]) return;
      if (s.surface_code === 'category_featured') catData[s.category_code].featured++;
      if (s.surface_code === 'category_feed') catData[s.category_code].feed++;
      catData[s.category_code].live++;
      if (s.content_items?.source_country === 'lk') catData[s.category_code].sl++;
    });
    // Compute avg quality from published items by category tag
    (published ?? []).forEach((p: any) => {
      const q = p.content_ai_briefs?.[0]?.ai_quality_score ?? 0;
      (p.content_category_tags ?? []).forEach((t: any) => {
        if (catData[t.category_code]) {
          catData[t.category_code].avgQ += q;
        }
      });
    });
    // Average quality
    for (const cat of LANKAFIX_CATEGORIES) {
      const d = catData[cat];
      if (d.live > 0) d.avgQ = d.avgQ / d.live;
    }
    return catData;
  }, [surfaces, published]);

  // Premium surface analysis
  const premiumAnalysis = useMemo(() => {
    const premSurfaces = ['homepage_hero', 'homepage_safety', 'ai_banner_forum', 'category_featured'];
    return premSurfaces.map(code => {
      const items = surfacesByCode[code] ?? [];
      const slItems = items.filter((s: any) => s.content_items?.source_country === 'lk');
      const imgItems = items.filter((s: any) => s.content_items?.image_url);
      const avgQ = items.length > 0 ? items.reduce((sum: number, s: any) => sum + (s.rank_score ?? 0), 0) / items.length / 100 : 0;
      const readiness = getPremiumReadiness(items.length, slItems.length, avgQ);
      return { code, live: items.length, sl: slItems.length, img: imgItems.length, avgQ, readiness, mode: surfaceConfigMap[code]?.rollout_mode ?? 'evergreen_only' };
    });
  }, [surfacesByCode, surfaceConfigMap]);

  // Source performance ranking
  const sourcePerf = useMemo(() => {
    return (sources ?? []).filter((s: any) => s.active).map((s: any) => {
      const pubRate = s.counts.total > 0 ? s.counts.published / s.counts.total : 0;
      const imgRate = s.counts.total > 0 ? s.counts.withImage / s.counts.total : 0;
      const slRate = s.counts.total > 0 ? s.counts.sl / s.counts.total : 0;
      const perfScore = pubRate * 40 + (s.trust_score ?? 0.5) * 30 + slRate * 20 + imgRate * 10;
      let label: string;
      if (s.base_url?.includes('newsdata.io') && s.rollout_state === 'failing') label = '🔑 Blocked';
      else if (perfScore > 60) label = '★ Strong';
      else if (perfScore > 30) label = 'Stable';
      else if (s.counts.total >= 3 && pubRate < 0.1) label = 'Low yield';
      else label = 'Low data';
      return { ...s, pubRate, imgRate, slRate, perfScore, perfLabel: label };
    }).sort((a: any, b: any) => b.perfScore - a.perfScore);
  }, [sources]);

  // ─── Mutations ───
  const ingestMutation = useMutation({
    mutationFn: async ({ mode, tierLimit }: { mode: string; tierLimit?: string }) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', { body: { mode, tier_limit: tierLimit } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setLastRunResult({ ...data, timestamp: new Date().toISOString() });
      if (data.mode === 'dry_run' || data.mode === 'publish_preview') { setPreviewResult(data.preview); toast.success('Preview generated'); }
      else if (data.mode === 'validate_sources') toast.success(`Validated ${data.sources?.length ?? 0} sources`);
      else toast.success(`Pipeline complete (${data.mode})`);
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
        const { data: cs } = await supabase.from('content_surface_state').select('id, rank_score').eq('content_item_id', itemId).eq('active', true).lt('rank_score', 990);
        for (const surf of cs ?? []) await supabase.from('content_surface_state').update({ rank_score: Math.min(989, (surf.rank_score ?? 50) + 15) }).eq('id', surf.id);
      }
      await supabase.from('content_editorial_actions').insert({ content_item_id: itemId, action_type: action });
    },
    onSuccess: () => { toast.success('Action applied'); invalidateAll(); },
    onError: () => toast.error('Action failed'),
  });
  const toggleSource = useMutation({ mutationFn: async ({ sourceId, active }: { sourceId: string; active: boolean }) => { await supabase.from('content_sources').update({ active }).eq('id', sourceId); }, onSuccess: () => { toast.success('Source updated'); invalidateAll(); } });
  const promoteSource = useMutation({
    mutationFn: async ({ sourceId, targetState }: { sourceId: string; targetState: string }) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', { body: { mode: 'promote_source', source_id: sourceId, target_state: targetState } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => { toast.success(`Source promoted: ${data.from} → ${data.to}`); invalidateAll(); },
    onError: (e) => toast.error(`Promotion failed: ${(e as Error).message}`),
  });
  const quarantineSource = useMutation({
    mutationFn: async ({ sourceId, quarantine }: { sourceId: string; quarantine: boolean }) => {
      await supabase.from('content_sources').update({ rollout_state: quarantine ? 'quarantined' : 'validated' }).eq('id', sourceId);
    },
    onSuccess: () => { toast.success('Rollout updated'); invalidateAll(); },
  });
  const rollbackPublish = useMutation({
    mutationFn: async (surfaceCode?: string) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', { body: { mode: 'rollback', surface_code: surfaceCode } });
      if (error) throw error; return data;
    },
    onSuccess: (data) => { toast.success(`Rolled back ${data.rolled_back} assignments`); invalidateAll(); },
    onError: (e) => toast.error(`Rollback failed: ${(e as Error).message}`),
  });
  const updateSurfaceRollout = useMutation({
    mutationFn: async ({ surfaceCode, mode }: { surfaceCode: string; mode: string }) => {
      await supabase.from('content_surface_config' as any).update({ rollout_mode: mode, updated_at: new Date().toISOString() }).eq('surface_code', surfaceCode);
    },
    onSuccess: () => { toast.success('Surface rollout updated'); invalidateAll(); },
  });
  const freezeSurface = useMutation({
    mutationFn: async ({ surfaceCode, freeze }: { surfaceCode: string; freeze: boolean }) => {
      await supabase.from('content_surface_config' as any).update({ frozen: freeze, frozen_at: freeze ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('surface_code', surfaceCode);
    },
    onSuccess: () => { toast.success('Freeze updated'); invalidateAll(); },
  });
  const acknowledgeAlert = useMutation({
    mutationFn: async (id: string) => { await supabase.from('content_alerts' as any).update({ acknowledged_at: new Date().toISOString() }).eq('id', id); },
    onSuccess: () => { toast.success('Acknowledged'); invalidateAll(); },
  });
  const resolveAlert = useMutation({
    mutationFn: async (id: string) => { await supabase.from('content_alerts' as any).update({ resolved_at: new Date().toISOString() }).eq('id', id); },
    onSuccess: () => { toast.success('Resolved'); invalidateAll(); },
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

  const catReadyCount = LANKAFIX_CATEGORIES.filter(c => getCategoryReadiness(categoryCoverage[c] ?? { featured: 0, feed: 0, live: 0 }) === 'ready').length;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-heading text-xl font-bold flex items-center gap-2">
              Content Intelligence
              {totalPublished > 0 && <Badge variant="outline" className="text-[10px] font-normal"><Radio className="h-2.5 w-2.5 mr-1 text-primary" /> Live</Badge>}
              {(activeAlerts?.length ?? 0) > 0 && <Badge variant="destructive" className="text-[10px]"><Bell className="h-2.5 w-2.5 mr-1" /> {activeAlerts?.length}</Badge>}
            </h1>
          </div>
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => ingestMutation.mutate({ mode: 'validate_sources' })} disabled={isPending}><Shield className="h-3.5 w-3.5 mr-1" /> Validate</Button>
            <Button size="sm" onClick={() => ingestMutation.mutate({ mode: 'full' })} disabled={isPending}>
              {ingestMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />} Full Run
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => rollbackPublish.mutate(undefined)} disabled={isPending}><RotateCw className="h-3.5 w-3.5 mr-1" /> Rollback</Button>
          </div>
        </div>

        {/* Pipeline controls */}
        <div className="flex gap-1 mb-1.5 flex-wrap">
          {[
            { mode: 'fetch_only', icon: Database, label: 'Fetch' },
            { mode: 'brief', icon: FileText, label: 'Brief' },
            { mode: 'rescue_review', icon: Star, label: 'Rescue' },
            { mode: 'decay', icon: Timer, label: 'Decay' },
            { mode: 'cluster', icon: TrendingUp, label: 'Cluster' },
            { mode: 'backlog_burn', icon: Zap, label: 'Burn Backlog' },
          ].map(c => (
            <Button key={c.mode} size="sm" variant="ghost" className={`h-7 text-[10px] ${c.mode === 'backlog_burn' ? 'text-primary font-semibold' : ''}`}
              onClick={() => ingestMutation.mutate({ mode: c.mode })} disabled={isPending}>
              <c.icon className="h-3 w-3 mr-1" /> {c.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 mb-3 flex-wrap">
          <span className="text-[9px] text-muted-foreground self-center mr-1">Publish:</span>
          {[
            { mode: 'publish_fast', icon: Zap, label: 'Fast (Homepage)', accent: true },
            { mode: 'publish_premium', icon: Star, label: 'Premium Only' },
            { mode: 'publish_category_batch', icon: Layers, label: 'Category Batch' },
            { mode: 'publish', icon: Layers, label: 'Full (slow)' },
          ].map(c => (
            <Button key={c.mode} size="sm" variant="outline" className={`h-7 text-[10px] ${c.accent ? 'border-primary/20 text-primary' : ''}`}
              onClick={() => ingestMutation.mutate({ mode: c.mode })} disabled={isPending}>
              <c.icon className="h-3 w-3 mr-1" /> {c.label}
            </Button>
          ))}
        </div>

        {/* Active alerts */}
        {(activeAlerts?.length ?? 0) > 0 && (
          <Card className="p-3 mb-3 border-destructive/20 bg-destructive/[0.02]">
            <div className="flex items-center gap-2 mb-2"><ShieldAlert className="h-4 w-4 text-destructive" /><span className="text-xs font-bold">Active Alerts ({activeAlerts?.length})</span></div>
            <div className="space-y-1.5">
              {(activeAlerts ?? []).slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-[8px] shrink-0">{alert.severity}</Badge>
                    <span className="truncate">{alert.title}</span>
                    <span className="text-muted-foreground shrink-0">{formatTimeAgo(alert.created_at)}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!alert.acknowledged_at && <Button size="sm" variant="ghost" className="h-5 text-[8px] px-1.5" onClick={() => acknowledgeAlert.mutate(alert.id)}>Ack</Button>}
                    <Button size="sm" variant="ghost" className="h-5 text-[8px] px-1.5" onClick={() => resolveAlert.mutate(alert.id)}>Resolve</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Last Run */}
        {lastRunResult && (
          <Card className="p-3 mb-3 border-primary/20 bg-primary/[0.02]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> Last: <Badge variant="outline" className="text-[9px]">{lastRunResult.mode}</Badge></span>
              <span className="text-[10px] text-muted-foreground">{lastRunResult.duration_ms}ms</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-[10px]">
              <div>Fetched: <strong>{lastRunResult.fetched ?? 0}</strong></div>
              <div>Deduped: <strong>{lastRunResult.deduped ?? 0}</strong></div>
              <div>Briefed: <strong>{lastRunResult.briefed ?? 0}</strong></div>
              <div>Published: <strong className="text-primary">{lastRunResult.published ?? 0}</strong></div>
              <div>Rejected: <strong className="text-destructive">{lastRunResult.rejected ?? 0}</strong></div>
            </div>
            {lastRunResult.newsdata_key_present === false && <p className="text-[10px] text-warning mt-1">🔑 NEWSDATA_API_KEY missing — {blockedNewsdata} sources blocked</p>}
          </Card>
        )}

        {/* ═══ EXECUTIVE SUMMARY ═══ */}
        <Card className="p-3 mb-3 border-primary/15 bg-gradient-to-r from-primary/[0.02] to-transparent">
          <div className="flex items-center gap-2 mb-2"><BarChart3 className="h-4 w-4 text-primary" /><span className="text-xs font-bold">Executive Summary</span></div>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div className="text-center"><p className="text-lg font-bold text-primary">{totalPublished}</p><p className="text-muted-foreground">Published</p></div>
            <div className="text-center"><p className="text-lg font-bold">{slPublished}</p><p className="text-muted-foreground">🇱🇰 SL Items</p><p className="text-[9px] text-muted-foreground/60">{totalPublished > 0 ? Math.round(slPublished / totalPublished * 100) : 0}%</p></div>
            <div className="text-center"><p className="text-lg font-bold">{avgQuality.toFixed(2)}</p><p className="text-muted-foreground">Avg Quality</p></div>
            <div className="text-center"><p className="text-lg font-bold">{backlog}</p><p className="text-muted-foreground">Backlog</p></div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px] mt-2 pt-2 border-t border-border/20">
            <div className="text-center"><strong>{activeSources}</strong>/{totalSources}<br /><span className="text-muted-foreground">Sources</span></div>
            <div className="text-center"><strong className={blockedNewsdata > 0 ? 'text-destructive' : ''}>{blockedNewsdata}</strong><br /><span className="text-muted-foreground">Blocked</span></div>
            <div className="text-center"><strong>{coveredSurfaces}</strong>/10<br /><span className="text-muted-foreground">Surfaces</span></div>
            <div className="text-center"><strong>{catReadyCount}</strong>/15<br /><span className="text-muted-foreground">Categories</span></div>
          </div>
        </Card>

        {/* ═══ PREMIUM SURFACE READINESS ═══ */}
        <Card className="p-3 mb-3 border-accent/20">
          <div className="flex items-center gap-2 mb-2"><Star className="h-4 w-4 text-accent-foreground" /><span className="text-xs font-bold">Premium Surface Readiness</span></div>
          <div className="space-y-2">
            {premiumAnalysis.map(p => {
              const rs = PREMIUM_READINESS_STYLES[p.readiness];
              return (
                <div key={p.code} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${rs.dot}`} />
                    <span className="text-xs font-semibold">{p.code.replace(/homepage_|_/g, m => m === '_' ? ' ' : '').trim()}</span>
                    <Badge variant="outline" className={`text-[8px] ${rs.color}`}>{rs.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span><strong>{p.live}</strong> live</span>
                    <span>🇱🇰 {p.sl}</span>
                    <span><Image className="h-2.5 w-2.5 inline mr-0.5" />{p.img}</span>
                    <span className="text-[9px]">{p.mode.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Tabs defaultValue="sources">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="sources">Sources ({activeSources})</TabsTrigger>
            <TabsTrigger value="queue">Queue ({queue?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="published">Published ({totalPublished})</TabsTrigger>
            <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="clusters">Trends</TabsTrigger>
          </TabsList>

          {/* ─── Sources Tab (performance-ranked) ─── */}
          <TabsContent value="sources" className="space-y-2 mt-3">
            {srcLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading…</p>}
            {sourcePerf.map((src: any) => {
              const health = getSourceHealth(src);
              return (
                <Card key={src.id} className={`p-3 ${HEALTH_STYLES[health]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[health]}`} />
                        <span className="text-sm font-semibold truncate">{src.source_name}</span>
                        <Badge variant="outline" className={`text-[8px] ${src.perfLabel.includes('Strong') ? 'text-primary border-primary/20' : src.perfLabel.includes('Blocked') ? 'text-destructive border-destructive/20' : 'text-muted-foreground'}`}>{src.perfLabel}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5"><SourceHealthBadges src={src} /></div>
                      <div className="grid grid-cols-6 gap-1.5 text-[10px] text-muted-foreground">
                        <span>Total: {src.counts.total}</span>
                        <span className="text-primary">Pub: {src.counts.published}</span>
                        <span>Rate: {Math.round(src.pubRate * 100)}%</span>
                        <span>Trust: {src.trust_score?.toFixed(2)}</span>
                        <span>🇱🇰 {Math.round(src.slRate * 100)}%</span>
                        <span><Image className="h-2.5 w-2.5 inline" /> {Math.round(src.imgRate * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => toggleSource.mutate({ sourceId: src.id, active: !src.active })}>
                        {src.active ? <><Pause className="h-3 w-3 mr-1" /> Disable</> : <><Play className="h-3 w-3 mr-1" /> Enable</>}
                      </Button>
                      {src.active && (
                        <>
                          <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => quarantineSource.mutate({ sourceId: src.id, quarantine: src.rollout_state !== 'quarantined' })}>
                            {src.rollout_state === 'quarantined' ? <><Unlock className="h-3 w-3 mr-1" /> Restore</> : <><Lock className="h-3 w-3 mr-1 text-destructive" /> Quarantine</>}
                          </Button>
                          {SOURCE_ROLLOUT_TRANSITIONS[src.rollout_state ?? 'inactive']?.filter(s => s !== 'quarantined' && s !== 'inactive').map(target => (
                            <Button key={target} size="sm" variant="ghost" className="h-6 text-[9px] text-primary" disabled={promoteSource.isPending}
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

          {/* ─── Queue Tab ─── */}
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
                        {item.content_category_tags?.slice(0, 2).map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>)}
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
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending} onClick={() => editorialAction.mutate({ itemId: item.id, action: 'approve' })} title="Approve"><CheckCircle className="h-4 w-4 text-primary" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending} onClick={() => editorialAction.mutate({ itemId: item.id, action: 'reject' })} title="Reject"><XCircle className="h-4 w-4 text-destructive" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending || reBriefMutation.isPending} onClick={() => reBriefMutation.mutate(item.id)} title="Re-brief"><RotateCw className={`h-3.5 w-3.5 text-muted-foreground ${reBriefMutation.isPending ? 'animate-spin' : ''}`} /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* ─── Published Tab ─── */}
          <TabsContent value="published" className="space-y-2 mt-3">
            {pubLoading && <p className="text-center py-8 text-muted-foreground text-sm animate-pulse">Loading…</p>}
            {!pubLoading && !published?.length && <EmptyState message="No published items" icon={Eye} />}
            {(published ?? []).slice(0, 50).map((item: any) => {
              const brief = item.content_ai_briefs?.[0];
              return (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                        {item.content_category_tags?.slice(0, 2).map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>)}
                        {item.source_country === 'lk' && <span className="text-[9px]">🇱🇰</span>}
                        {item.image_url && <Image className="h-2.5 w-2.5 text-muted-foreground" />}
                      </div>
                      <p className="text-sm font-semibold line-clamp-1">{brief?.ai_headline ?? item.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Q: {brief?.ai_quality_score?.toFixed(2) ?? '—'}</span>
                        <span>Fresh: {item.freshness_score ?? 0}</span>
                        <span>{item.source_name ?? 'LankaFix'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending} onClick={() => editorialAction.mutate({ itemId: item.id, action: 'pin_hero' })} title="Pin Hero"><Pin className="h-3.5 w-3.5 text-primary" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending} onClick={() => editorialAction.mutate({ itemId: item.id, action: 'boost' })} title="Boost"><ChevronUp className="h-3.5 w-3.5 text-accent-foreground" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending} onClick={() => editorialAction.mutate({ itemId: item.id, action: 'suppress' })} title="Suppress"><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* ─── Surfaces Tab ─── */}
          <TabsContent value="surfaces" className="space-y-2 mt-3">
            {REQUIRED_SURFACES.map(code => {
              const items = surfacesByCode[code] ?? [];
              const config = surfaceConfigMap[code];
              const hasSL = items.some((s: any) => s.content_items?.source_country === 'lk');
              return (
                <Card key={code} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${items.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{code.replace(/_/g, ' ')}</span>
                      <Badge variant="outline" className={`text-[9px] ${items.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{items.length} live</Badge>
                      {hasSL && <span className="text-[9px]">🇱🇰</span>}
                      {config?.frozen && <Badge variant="destructive" className="text-[8px]"><Lock className="h-2 w-2 mr-0.5" /> Frozen</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <select className="text-[9px] bg-transparent border border-border rounded px-1 py-0.5" value={config?.rollout_mode ?? 'evergreen_only'}
                        onChange={(e) => updateSurfaceRollout.mutate({ surfaceCode: code, mode: e.target.value })}>
                        {SURFACE_ROLLOUT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                      </select>
                      <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => freezeSurface.mutate({ surfaceCode: code, freeze: !config?.frozen })}>
                        {config?.frozen ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {items.length === 0 ? <p>Evergreen fallback active.</p> : items.slice(0, 3).map((s: any) => (
                      <p key={s.id} className="truncate">#{Math.round(s.rank_score ?? 0)} · {s.content_items?.title ?? '—'} {s.rank_score >= 990 && <span className="text-primary">📌</span>}</p>
                    ))}
                    {items.length > 3 && <p className="text-muted-foreground/50">+{items.length - 3} more</p>}
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* ─── Categories Tab (with quality metrics) ─── */}
          <TabsContent value="categories" className="space-y-2 mt-3">
            {LANKAFIX_CATEGORIES.map(cat => {
              const data = categoryCoverage[cat] ?? { featured: 0, feed: 0, live: 0 };
              const readiness = getCategoryReadiness(data);
              const rs = READINESS_STYLES[readiness];
              return (
                <Card key={cat} className={`p-2.5 ${readiness === 'fallback_only' ? 'border-muted/40' : readiness === 'weak' ? 'border-warning/15' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{cat}</span>
                      <Badge variant="outline" className={`text-[8px] ${rs.color}`}>{rs.label}</Badge>
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

          {/* ─── History Tab ─── */}
          <TabsContent value="history" className="space-y-2 mt-3">
            {!pipelineHistory?.length && <EmptyState message="No pipeline runs yet" icon={History} />}
            {(pipelineHistory ?? []).map((run: any) => (
              <Card key={run.id} className={`p-3 ${run.status === 'failed' ? 'border-destructive/20' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={run.status === 'failed' ? 'destructive' : 'outline'} className="text-[9px]">{run.status}</Badge>
                    <Badge variant="outline" className="text-[9px]">{run.mode}</Badge>
                    <span className="text-[10px] text-muted-foreground">{run.triggered_by}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{run.duration_ms ? `${run.duration_ms}ms` : '—'} · {formatTimeAgo(run.started_at)}</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 text-[10px]">
                  <span>Fetch: {run.fetched ?? 0}</span>
                  <span>Brief: {run.briefed ?? 0}</span>
                  <span className="text-primary">Pub: {run.published ?? 0}</span>
                  <span className="text-destructive">Rej: {run.rejected ?? 0}</span>
                  <span>Decay: {run.decayed ?? 0}</span>
                  <span>Err: {run.errors_count ?? 0}</span>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Trends Tab ─── */}
          <TabsContent value="clusters" className="space-y-2 mt-3">
            {!clusters?.length && <EmptyState message="No trend clusters detected" icon={TrendingUp} />}
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
