/**
 * AIAuditLogPage — Operator-only searchable audit of AI advisory events.
 * Reads from ai_events table. Advisory only — never modifies state.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, ArrowLeft, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AI_MODULES = [
  "ai_issue_triage", "ai_estimate_assist", "ai_partner_ranking", "ai_review_summary",
  "ai_fraud_watch", "ai_operator_copilot", "ai_photo_triage", "ai_quality_monitor",
  "ai_retention_nudges", "ai_demand_heatmap", "ai_voice_booking", "ai_whatsapp_assist",
];

const CONFIDENCE_BANDS = [
  { label: "All", value: "all" },
  { label: "High (≥80)", value: "high" },
  { label: "Medium (50-79)", value: "medium" },
  { label: "Low (<50)", value: "low" },
];

const AIAuditLogPage = () => {
  const navigate = useNavigate();
  const [moduleFilter, setModuleFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["ai-audit-log", moduleFilter, confidenceFilter, sortDir],
    queryFn: async () => {
      let query = supabase
        .from("ai_events")
        .select("*")
        .order("created_at", { ascending: sortDir === "asc" })
        .limit(200);

      if (moduleFilter !== "all") query = query.eq("ai_module", moduleFilter);
      if (confidenceFilter === "high") query = query.gte("confidence_score", 80);
      else if (confidenceFilter === "medium") query = query.gte("confidence_score", 50).lt("confidence_score", 80);
      else if (confidenceFilter === "low") query = query.lt("confidence_score", 50);

      const { data } = await query;
      return data || [];
    },
    staleTime: 15_000,
  });

  const filtered = events.filter((e: any) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      e.ai_module?.toLowerCase().includes(s) ||
      e.input_summary?.toLowerCase().includes(s) ||
      e.output_summary?.toLowerCase().includes(s) ||
      e.booking_id?.toLowerCase().includes(s) ||
      e.partner_id?.toLowerCase().includes(s)
    );
  });

  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl py-6 px-4 space-y-5">
        {/* Header */}
        <div className="space-y-3">
          <Link to="/ops/ai-control-center" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> AI Control Center
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Audit Log</h1>
                <p className="text-sm text-muted-foreground">Advisory event history</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">Internal Only</Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {AI_MODULES.map((m) => <SelectItem key={m} value={m}>{m.replace("ai_", "").replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Confidence" /></SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_BANDS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search booking, partner, text..."
                  className="pl-9 text-xs"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-[10px] gap-1" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
                {sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                {sortDir === "desc" ? "Newest first" : "Oldest first"}
              </Button>
              <span className="text-[10px] text-muted-foreground ml-auto">{filtered.length} events</span>
            </div>
          </CardContent>
        </Card>

        {/* Events */}
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No AI events found matching filters.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((evt: any) => {
              const expanded = expandedRow === evt.id;
              return (
                <Card key={evt.id} className="cursor-pointer" onClick={() => setExpandedRow(expanded ? null : evt.id)}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px]">{evt.ai_module?.replace("ai_", "")}</Badge>
                      <span className="text-[10px] text-muted-foreground flex-1">
                        {new Date(evt.created_at).toLocaleString()}
                      </span>
                      {evt.confidence_score != null && (
                        <Badge variant={evt.confidence_score >= 70 ? "default" : "outline"} className="text-[9px]">
                          {evt.confidence_score}%
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[8px]">Advisory</Badge>
                    </div>
                    {evt.output_summary && (
                      <p className="text-[11px] text-foreground truncate">{evt.output_summary}</p>
                    )}
                    {expanded && (
                      <div className="pt-2 border-t border-border/30 space-y-1.5 text-[10px]">
                        {evt.input_summary && <p><span className="text-muted-foreground">Input:</span> {evt.input_summary}</p>}
                        {evt.booking_id && <p><span className="text-muted-foreground">Booking:</span> {evt.booking_id}</p>}
                        {evt.partner_id && <p><span className="text-muted-foreground">Partner:</span> {evt.partner_id}</p>}
                        {evt.user_id && <p><span className="text-muted-foreground">User:</span> {evt.user_id}</p>}
                        <div className="flex gap-2">
                          {evt.accepted_by_user != null && (
                            <Badge variant={evt.accepted_by_user ? "default" : "secondary"} className="text-[8px]">
                              User: {evt.accepted_by_user ? "Accepted" : "Declined"}
                            </Badge>
                          )}
                          {evt.accepted_by_operator != null && (
                            <Badge variant={evt.accepted_by_operator ? "default" : "secondary"} className="text-[8px]">
                              Operator: {evt.accepted_by_operator ? "Accepted" : "Declined"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2">
            {[
              { label: "AI Control Center", route: "/ops/ai-control-center" },
              { label: "Module Health", route: "/ops/ai-module-health" },
              { label: "AI Intelligence", route: "/ops/ai-intelligence" },
              { label: "Governance Hub", route: "/ops/governance-hub" },
            ].map((link) => (
              <Badge key={link.route} variant="outline" className="cursor-pointer hover:bg-primary/10 text-[11px]" onClick={() => navigate(link.route)}>
                {link.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default AIAuditLogPage;
