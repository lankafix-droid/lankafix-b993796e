import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, CalendarClock, ArrowLeft, Loader2, RefreshCw, Wrench, FileText,
  Shield, Sparkles, RotateCcw, ChevronRight, Clock, AlertTriangle,
  CheckCircle2, Heart, Zap, Timer,
} from "lucide-react";

interface Reminder {
  type: string;
  category_code: string;
  title: string;
  message: string;
  due_date?: string;
  days_until_due?: number;
  priority: string;
  linked_booking_id?: string;
  linked_quote_id?: string;
  action?: string;
  source_category?: string;
  source_booking_id?: string;
}

interface NextBest {
  type: string;
  category_code: string;
  title: string;
  message: string;
  action: string;
  source_category: string;
}

interface QuickRebook {
  booking_id: string;
  category_code: string;
  service_type: string;
  completed_at: string;
  days_ago: number;
}

interface RetentionData {
  reminders: Reminder[];
  next_best_suggestions: NextBest[];
  quick_rebook: QuickRebook[];
  churn_risk: { score: number; level: string };
  rebook_likelihood: number;
  stats: { total_bookings: number; completed_bookings: number; pending_quotes: number; active_warranties: number };
}

const CATEGORY_LABELS: Record<string, string> = {
  AC: "AC Services", MOBILE: "Mobile Repairs", IT: "IT Support", CCTV: "CCTV Solutions",
  SOLAR: "Solar Solutions", CONSUMER_ELEC: "Electronics", SMART_HOME_OFFICE: "Smart Home",
  COPIER: "Copier/Printer", ELECTRICAL: "Electrical", PLUMBING: "Plumbing",
  NETWORK: "Network", HOME_SECURITY: "Home Security", POWER_BACKUP: "Power Backup",
  DEVICE: "Device", UNKNOWN: "Service",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  maintenance: Wrench, quote_expiry: FileText, quote_followup: FileText,
  warranty_expiry: Shield, next_best_service: Sparkles,
};

const priorityStyles: Record<string, string> = {
  urgent: "bg-destructive/10 border-destructive/20 text-destructive",
  high: "bg-warning/10 border-warning/20 text-warning",
  normal: "bg-primary/10 border-primary/20 text-primary",
};

export default function RemindersPage() {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (!userId) {
        // Show empty state for unauthenticated users
        setData({
          reminders: [],
          next_best_suggestions: [],
          quick_rebook: [],
          churn_risk: { score: 0, level: "low" },
          rebook_likelihood: 0,
          stats: { total_bookings: 0, completed_bookings: 0, pending_quotes: 0, active_warranties: 0 },
        });
        return;
      }

      const { data: res, error: err } = await supabase.functions.invoke("retention-engine", {
        body: { mode: "customer", customer_id: userId },
      });
      if (err) throw new Error(err.message);
      setData(res as RetentionData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-top">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your reminders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={fetchData} variant="outline" size="sm"><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const d = data!;
  const urgentReminders = d.reminders.filter(r => r.priority === "urgent");
  const upcomingReminders = d.reminders.filter(r => r.priority !== "urgent");
  const hasContent = d.reminders.length > 0 || d.next_best_suggestions.length > 0 || d.quick_rebook.length > 0;

  return (
    <div className="min-h-screen bg-background safe-area-top pb-24">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
          <Bell className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">My Reminders</h1>
            <p className="text-[10px] text-muted-foreground">Service care & upcoming actions</p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 gap-1 text-xs">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {!hasContent ? (
          /* ─── Empty state ─── */
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-5">
                <CalendarClock className="w-7 h-7 text-primary/40" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">No Reminders Yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed mb-5">
                After your first service, we'll track maintenance schedules and send you timely reminders.
              </p>
              <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground">
                Browse Services
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ─── Urgent Reminders ─── */}
            {urgentReminders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-bold text-foreground">Needs Attention</span>
                  <Badge variant="destructive" className="text-[9px]">{urgentReminders.length}</Badge>
                </div>
                {urgentReminders.map((r, i) => {
                  const Icon = CATEGORY_ICONS[r.type] || Bell;
                  return (
                    <Card key={i} className="border-destructive/20 bg-destructive/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-destructive/10">
                            <Icon className="w-4 h-4 text-destructive" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-foreground">{r.title}</span>
                              <Badge variant="outline" className="text-[8px] bg-destructive/10 text-destructive border-destructive/20 shrink-0">
                                {r.days_until_due != null && r.days_until_due <= 0 ? "Overdue" : "Urgent"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.message}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-[8px]">
                                {CATEGORY_LABELS[r.category_code] || r.category_code}
                              </Badge>
                              {r.due_date && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(r.due_date).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="mt-3 h-8 text-xs bg-primary text-primary-foreground"
                              onClick={() => {
                                if (r.linked_quote_id) navigate(`/quote/${r.linked_booking_id}`);
                                else if (r.category_code && r.category_code !== "DEVICE" && r.category_code !== "UNKNOWN")
                                  navigate(`/book/${r.category_code}`);
                              }}
                            >
                              {r.type === "quote_expiry" ? "Review Quote" : r.type === "warranty_expiry" ? "Book Checkup" : "Book Now"}
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ─── Upcoming Reminders ─── */}
            {upcomingReminders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Upcoming Care</span>
                </div>
                {upcomingReminders.map((r, i) => {
                  const Icon = CATEGORY_ICONS[r.type] || Bell;
                  return (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-foreground">{r.title}</span>
                              {r.days_until_due != null && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Timer className="w-2.5 h-2.5" />
                                  {r.days_until_due}d
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.message}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-[8px]">
                                {CATEGORY_LABELS[r.category_code] || r.category_code}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2.5 h-7 text-[10px]"
                              onClick={() => {
                                if (r.linked_quote_id) navigate(`/quote/${r.linked_booking_id}`);
                                else if (r.category_code && r.category_code !== "DEVICE" && r.category_code !== "UNKNOWN")
                                  navigate(`/book/${r.category_code}`);
                              }}
                            >
                              {r.type === "quote_followup" ? "Request Revision" : "Schedule Service"}
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ─── Quick Rebook ─── */}
            {d.quick_rebook.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-success" />
                  <span className="text-sm font-bold text-foreground">Quick Rebook</span>
                </div>
                <Card>
                  <CardContent className="p-3 space-y-2">
                    {d.quick_rebook.slice(0, 3).map((rb, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">
                            {CATEGORY_LABELS[rb.category_code] || rb.category_code}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            {rb.service_type ? rb.service_type.replace(/_/g, " ") : "Service"} · {rb.days_ago}d ago
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => navigate(`/book/${rb.category_code}`)}
                        >
                          Rebook <ChevronRight className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ─── Next Best Service ─── */}
            {d.next_best_suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Recommended for You</span>
                </div>
                {d.next_best_suggestions.map((s, i) => (
                  <Card key={i} className="border-primary/15 bg-primary/[0.02]">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">{s.title}</span>
                          <p className="text-[11px] text-muted-foreground mt-1">{s.message}</p>
                          <Button
                            size="sm"
                            className="mt-2.5 h-7 text-[10px] bg-primary text-primary-foreground gap-1"
                            onClick={() => navigate(`/book/${s.category_code}`)}
                          >
                            Learn More <ChevronRight className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ─── Service Summary ─── */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm font-bold text-foreground">Your Service History</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xl font-bold text-foreground">{d.stats.total_bookings}</p>
                    <p className="text-[9px] text-muted-foreground">Total Bookings</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xl font-bold text-success">{d.stats.completed_bookings}</p>
                    <p className="text-[9px] text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xl font-bold text-primary">{d.stats.pending_quotes}</p>
                    <p className="text-[9px] text-muted-foreground">Pending Quotes</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xl font-bold text-foreground">{d.stats.active_warranties}</p>
                    <p className="text-[9px] text-muted-foreground">Active Warranties</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
