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
  Activity, Eye, TrendingUp, AlertTriangle, Power, RotateCw, Star
} from 'lucide-react';

function EmptyState({ message }: { message: string }) {
  return <p className="text-center py-8 text-sm text-muted-foreground">{message}</p>;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card className="p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </Card>
  );
}

export default function ContentIntelligenceOpsPage() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['content-ops'] });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['content-ops', 'queue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_items')
        .select('*, content_ai_briefs(*), content_category_tags(*)')
        .in('status', ['new', 'needs_review', 'processed'])
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: published } = useQuery({
    queryKey: ['content-ops', 'published'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_items')
        .select('*, content_ai_briefs(*), content_category_tags(*)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: sources } = useQuery({
    queryKey: ['content-ops', 'sources'],
    queryFn: async () => {
      const { data } = await supabase.from('content_sources').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: surfaces } = useQuery({
    queryKey: ['content-ops', 'surfaces'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_surface_state')
        .select('*, content_items(title, content_type, status)')
        .eq('active', true)
        .order('surface_code')
        .order('rank_score', { ascending: false });
      return data ?? [];
    },
  });

  const { data: clusters } = useQuery({
    queryKey: ['content-ops', 'clusters'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_trend_clusters')
        .select('*')
        .eq('active', true)
        .order('momentum_score', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['content-ops', 'analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_events')
        .select('event_type, content_item_id')
        .order('created_at', { ascending: false })
        .limit(500);
      const events = data ?? [];
      const byType: Record<string, number> = {};
      events.forEach((e: any) => { byType[e.event_type] = (byType[e.event_type] ?? 0) + 1; });
      return { total: events.length, ...byType };
    },
  });

  // Mutations
  const ingestMutation = useMutation({
    mutationFn: async (mode: string) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', { body: { mode } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Pipeline complete: ${JSON.stringify(data)}`);
      invalidateAll();
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  const editorialAction = useMutation({
    mutationFn: async ({ itemId, action }: { itemId: string; action: string }) => {
      const statusMap: Record<string, string> = {
        approve: 'published',
        reject: 'rejected',
        archive: 'archived',
      };
      const newStatus = statusMap[action];
      if (newStatus) {
        await supabase.from('content_items').update({ status: newStatus }).eq('id', itemId);
      }
      if (action === 'pin_hero') {
        // Deactivate current hero pins then insert
        await supabase.from('content_surface_state').update({ active: false }).eq('surface_code', 'homepage_hero').eq('active', true);
        await supabase.from('content_surface_state').insert({
          surface_code: 'homepage_hero',
          content_item_id: itemId,
          rank_score: 999,
          active: true,
        });
      }
      if (action === 'suppress') {
        await supabase.from('content_items').update({ status: 'rejected', rejection_reason: 'ops_suppressed' }).eq('id', itemId);
        await supabase.from('content_surface_state').update({ active: false }).eq('content_item_id', itemId);
      }
      await supabase.from('content_editorial_actions').insert({
        content_item_id: itemId,
        action_type: action,
      });
    },
    onSuccess: () => {
      toast.success('Action applied');
      invalidateAll();
    },
    onError: () => toast.error('Action failed'),
  });

  const toggleSource = useMutation({
    mutationFn: async ({ sourceId, active }: { sourceId: string; active: boolean }) => {
      await supabase.from('content_sources').update({ active }).eq('id', sourceId);
    },
    onSuccess: () => {
      toast.success('Source updated');
      invalidateAll();
    },
  });

  const reBriefMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // Delete old brief, reset status, trigger brief pipeline
      await supabase.from('content_ai_briefs').delete().eq('content_item_id', itemId);
      await supabase.from('content_items').update({ status: 'new' }).eq('id', itemId);
      const { error } = await supabase.functions.invoke('content-ingest', { body: { mode: 'brief' } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Re-briefed');
      invalidateAll();
    },
    onError: () => toast.error('Re-brief failed'),
  });

  const surfacesByCode = useMemo(() => {
    const map: Record<string, any[]> = {};
    (surfaces ?? []).forEach((s: any) => { (map[s.surface_code] ??= []).push(s); });
    return map;
  }, [surfaces]);

  const isPending = ingestMutation.isPending || editorialAction.isPending;

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-heading text-xl font-bold">Content Intelligence Ops</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => ingestMutation.mutate('ingest')} disabled={isPending}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${ingestMutation.isPending ? 'animate-spin' : ''}`} />
              Ingest
            </Button>
            <Button size="sm" variant="outline" onClick={() => ingestMutation.mutate('brief')} disabled={isPending}>
              <Star className="h-3.5 w-3.5 mr-1" /> Brief
            </Button>
            <Button size="sm" onClick={() => ingestMutation.mutate('full')} disabled={isPending}>
              Full Pipeline
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatCard label="Queue" value={queue?.length ?? 0} icon={AlertTriangle} color="text-warning" />
          <StatCard label="Published" value={published?.length ?? 0} icon={Eye} color="text-primary" />
          <StatCard label="Clusters" value={clusters?.length ?? 0} icon={TrendingUp} color="text-accent-foreground" />
          <StatCard label="Events" value={analytics?.total ?? 0} icon={BarChart3} color="text-muted-foreground" />
        </div>

        <Tabs defaultValue="queue">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="queue">Queue ({queue?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
            <TabsTrigger value="clusters">Trends</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* ─── Queue Tab ─── */}
          <TabsContent value="queue" className="space-y-2 mt-3">
            {queueLoading && <p className="text-center py-8 text-muted-foreground text-sm">Loading…</p>}
            {!queueLoading && !queue?.length && <EmptyState message="No items in queue" />}
            {(queue ?? []).map((item: any) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                      <Badge variant={item.status === 'needs_review' ? 'destructive' : 'outline'} className="text-[10px]">{item.status}</Badge>
                      {item.content_category_tags?.map((t: any) => (
                        <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
                      ))}
                    </div>
                    <p className="text-sm font-semibold line-clamp-1">{item.title}</p>
                    {item.content_ai_briefs?.[0]?.ai_summary_short && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.content_ai_briefs[0].ai_summary_short}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Quality: {(item.content_ai_briefs?.[0]?.ai_quality_score?.toFixed(2) ?? 'N/A')} · Trust: {item.source_trust_score?.toFixed(2) ?? 'N/A'} · Source: {item.source_name ?? '—'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                      onClick={() => editorialAction.mutate({ itemId: item.id, action: 'approve' })} title="Approve">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                      onClick={() => editorialAction.mutate({ itemId: item.id, action: 'reject' })} title="Reject">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                      onClick={() => reBriefMutation.mutate(item.id)} title="Re-brief">
                      <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Published Tab ─── */}
          <TabsContent value="published" className="space-y-2 mt-3">
            {!published?.length && <EmptyState message="No published items" />}
            {(published ?? []).map((item: any) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                      {item.content_category_tags?.map((t: any) => (
                        <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
                      ))}
                    </div>
                    <p className="text-sm font-semibold line-clamp-1">{item.content_ai_briefs?.[0]?.ai_headline ?? item.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Freshness: {item.freshness_score ?? 0} · Quality: {item.content_ai_briefs?.[0]?.ai_quality_score?.toFixed(2) ?? '—'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                      onClick={() => editorialAction.mutate({ itemId: item.id, action: 'pin_hero' })} title="Pin to Hero">
                      <Pin className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                      onClick={() => editorialAction.mutate({ itemId: item.id, action: 'suppress' })} title="Suppress">
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isPending}
                      onClick={() => editorialAction.mutate({ itemId: item.id, action: 'archive' })} title="Archive">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Sources Tab ─── */}
          <TabsContent value="sources" className="space-y-2 mt-3">
            {!sources?.length && <EmptyState message="No sources configured" />}
            {(sources ?? []).map((src: any) => (
              <Card key={src.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{src.source_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {src.source_type} · Trust: {src.trust_score} · Refresh: {src.refresh_interval_minutes}min
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Last fetched: {src.last_fetched_at ? new Date(src.last_fetched_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={src.active ? 'default' : 'secondary'}
                    disabled={toggleSource.isPending}
                    onClick={() => toggleSource.mutate({ sourceId: src.id, active: !src.active })}
                  >
                    <Power className="h-3 w-3 mr-1" />
                    {src.active ? 'Active' : 'Disabled'}
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Surfaces Tab ─── */}
          <TabsContent value="surfaces" className="space-y-4 mt-3">
            {!surfaces?.length && <EmptyState message="No active surfaces. Run pipeline to populate." />}
            {Object.entries(surfacesByCode).map(([code, items]) => (
              <div key={code}>
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5 text-primary" />
                  {code.replace(/_/g, ' ')}
                  <Badge variant="outline" className="text-[10px] ml-1">{items.length}</Badge>
                </h3>
                <div className="space-y-1">
                  {items.map((s: any) => (
                    <Card key={s.id} className="p-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium line-clamp-1">{s.content_items?.title ?? 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">{s.content_items?.content_type ?? ''}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">Score: {s.rank_score?.toFixed(1)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ─── Clusters Tab ─── */}
          <TabsContent value="clusters" className="space-y-2 mt-3">
            {!clusters?.length && <EmptyState message="No trend clusters yet" />}
            {(clusters ?? []).map((c: any) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{c.cluster_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.category_code ?? 'General'} · {c.content_count} items · Momentum: {c.momentum_score}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      🇱🇰 {c.sri_lanka_relevance_score ?? 0} · 💼 {c.commercial_relevance_score ?? 0}
                    </p>
                  </div>
                  <Activity className="h-4 w-4 text-primary" />
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Analytics Tab ─── */}
          <TabsContent value="analytics" className="mt-3">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Clicks', value: (analytics as any)?.click ?? 0 },
                { label: 'Impressions', value: (analytics as any)?.impression ?? 0 },
                { label: 'Opens', value: (analytics as any)?.open ?? 0 },
              ].map(m => (
                <Card key={m.label} className="p-4 text-center">
                  <p className="text-2xl font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Saves', value: (analytics as any)?.save ?? 0 },
                { label: 'Shares', value: (analytics as any)?.share ?? 0 },
                { label: 'Booking CTR', value: (analytics as any)?.booking_clickthrough ?? 0 },
                { label: 'Category CTR', value: (analytics as any)?.category_clickthrough ?? 0 },
              ].map(m => (
                <Card key={m.label} className="p-3 text-center">
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </PageTransition>
  );
}
