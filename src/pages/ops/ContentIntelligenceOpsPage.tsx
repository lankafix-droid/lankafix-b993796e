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
  Activity, Eye, TrendingUp, AlertTriangle
} from 'lucide-react';

export default function ContentIntelligenceOpsPage() {
  const queryClient = useQueryClient();

  const { data: queue } = useQuery({
    queryKey: ['content-ops-queue'],
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
    queryKey: ['content-ops-published'],
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
    queryKey: ['content-ops-sources'],
    queryFn: async () => {
      const { data } = await supabase.from('content_sources').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: surfaces } = useQuery({
    queryKey: ['content-ops-surfaces'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_surface_state')
        .select('*, content_items(title, content_type)')
        .eq('active', true)
        .order('surface_code')
        .order('rank_score', { ascending: false });
      return data ?? [];
    },
  });

  const { data: clusters } = useQuery({
    queryKey: ['content-ops-clusters'],
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
    queryKey: ['content-ops-analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_events')
        .select('event_type, content_item_id')
        .order('created_at', { ascending: false })
        .limit(500);
      const events = data ?? [];
      const clicks = events.filter((e: any) => e.event_type === 'click').length;
      const impressions = events.filter((e: any) => e.event_type === 'impression').length;
      const opens = events.filter((e: any) => e.event_type === 'open').length;
      return { total: events.length, clicks, impressions, opens };
    },
  });

  const ingestMutation = useMutation({
    mutationFn: async (mode: string) => {
      const { data, error } = await supabase.functions.invoke('content-ingest', { body: { mode } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Pipeline complete: ${JSON.stringify(data)}`);
      queryClient.invalidateQueries({ queryKey: ['content-ops'] });
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  const editorialAction = useMutation({
    mutationFn: async ({ itemId, action }: { itemId: string; action: string }) => {
      const statusMap: Record<string, string> = { approve: 'published', reject: 'rejected', archive: 'archived' };
      const newStatus = statusMap[action];
      if (newStatus) await supabase.from('content_items').update({ status: newStatus }).eq('id', itemId);
      await supabase.from('content_editorial_actions').insert({ content_item_id: itemId, action_type: action });
    },
    onSuccess: () => {
      toast.success('Action applied');
      queryClient.invalidateQueries({ queryKey: ['content-ops'] });
    },
  });

  const toggleSource = useMutation({
    mutationFn: async ({ sourceId, active }: { sourceId: string; active: boolean }) => {
      await supabase.from('content_sources').update({ active }).eq('id', sourceId);
    },
    onSuccess: () => {
      toast.success('Source updated');
      queryClient.invalidateQueries({ queryKey: ['content-ops-sources'] });
    },
  });

  const surfacesByCode = useMemo(() => {
    const map: Record<string, any[]> = {};
    (surfaces ?? []).forEach((s: any) => {
      (map[s.surface_code] ??= []).push(s);
    });
    return map;
  }, [surfaces]);

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-heading text-xl font-bold">Content Intelligence Ops</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => ingestMutation.mutate('full')} disabled={ingestMutation.isPending}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${ingestMutation.isPending ? 'animate-spin' : ''}`} />
              Full Pipeline
            </Button>
            <Button size="sm" onClick={() => ingestMutation.mutate('publish')} disabled={ingestMutation.isPending}>
              Publish
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Queue', value: queue?.length ?? 0, icon: AlertTriangle, color: 'text-warning' },
            { label: 'Published', value: published?.length ?? 0, icon: Eye, color: 'text-primary' },
            { label: 'Clusters', value: clusters?.length ?? 0, icon: TrendingUp, color: 'text-accent-foreground' },
            { label: 'Events', value: analytics?.total ?? 0, icon: BarChart3, color: 'text-muted-foreground' },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
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

          <TabsContent value="queue" className="space-y-2 mt-3">
            {(queue ?? []).map((item: any) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                      <Badge variant={item.status === 'needs_review' ? 'destructive' : 'outline'} className="text-[10px]">{item.status}</Badge>
                    </div>
                    <p className="text-sm font-semibold line-clamp-1">{item.title}</p>
                    {item.content_ai_briefs?.[0]?.ai_summary_short && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.content_ai_briefs[0].ai_summary_short}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Quality: {(item.content_ai_briefs?.[0]?.ai_quality_score ?? 'N/A')} · Trust: {item.source_trust_score ?? 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editorialAction.mutate({ itemId: item.id, action: 'approve' })}>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editorialAction.mutate({ itemId: item.id, action: 'reject' })}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {!queue?.length && <p className="text-center py-8 text-muted-foreground">No items in queue</p>}
          </TabsContent>

          <TabsContent value="published" className="space-y-2 mt-3">
            {(published ?? []).map((item: any) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">{item.content_type.replace(/_/g, ' ')}</Badge>
                      {item.content_category_tags?.map((t: any) => (
                        <Badge key={t.id} variant="outline" className="text-[10px]">{t.category_code}</Badge>
                      ))}
                    </div>
                    <p className="text-sm font-semibold line-clamp-1">{item.content_ai_briefs?.[0]?.ai_headline ?? item.title}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editorialAction.mutate({ itemId: item.id, action: 'archive' })}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sources" className="space-y-2 mt-3">
            {(sources ?? []).map((src: any) => (
              <Card key={src.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{src.source_name}</p>
                    <p className="text-xs text-muted-foreground">{src.source_type} · Trust: {src.trust_score} · Refresh: {src.refresh_interval_minutes}min</p>
                  </div>
                  <Button
                    size="sm"
                    variant={src.active ? 'default' : 'secondary'}
                    onClick={() => toggleSource.mutate({ sourceId: src.id, active: !src.active })}
                  >
                    {src.active ? 'Active' : 'Disabled'}
                  </Button>
                </div>
              </Card>
            ))}
            {!sources?.length && <p className="text-center py-8 text-muted-foreground">No sources configured</p>}
          </TabsContent>

          <TabsContent value="surfaces" className="space-y-4 mt-3">
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
                        <p className="text-xs font-medium line-clamp-1">{s.content_items?.title ?? 'Unknown'}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">Score: {s.rank_score?.toFixed(1)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
            {!surfaces?.length && <p className="text-center py-8 text-muted-foreground">No active surfaces. Run pipeline to populate.</p>}
          </TabsContent>

          <TabsContent value="clusters" className="space-y-2 mt-3">
            {(clusters ?? []).map((c: any) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{c.cluster_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.category_code ?? 'General'} · {c.content_count} items · Momentum: {c.momentum_score}
                    </p>
                  </div>
                  <Activity className="h-4 w-4 text-primary" />
                </div>
              </Card>
            ))}
            {!clusters?.length && <p className="text-center py-8 text-muted-foreground">No trend clusters yet</p>}
          </TabsContent>

          <TabsContent value="analytics" className="mt-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Clicks', value: analytics?.clicks ?? 0 },
                { label: 'Impressions', value: analytics?.impressions ?? 0 },
                { label: 'Opens', value: analytics?.opens ?? 0 },
              ].map(m => (
                <Card key={m.label} className="p-4 text-center">
                  <p className="text-2xl font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </Card>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-sm text-muted-foreground">
                Content analytics accumulate as users interact with intelligence surfaces. Track impressions, clicks, opens, saves, and booking clickthroughs to measure content effectiveness.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </PageTransition>
  );
}
