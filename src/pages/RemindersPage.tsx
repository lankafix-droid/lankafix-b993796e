import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
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
  source_booking_id?: string;
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

// Use shared labels, with fallback for non-standard codes
const REMINDER_CATEGORY_LABELS: Record<string, string> = {
  ...CATEGORY_LABELS,
  DEVICE: "Device", UNKNOWN: "Service",
};

// Category code → booking route slug mapping
const CATEGORY_ROUTE_SLUGS: Record<string, string> = {
  AC: "ac-solutions", MOBILE: "mobile-phone-repairs", IT: "it-repairs-support",
  CCTV: "cctv-solutions", SOLAR: "solar-solutions", ELECTRICAL: "electrical-services",
  PLUMBING: "plumbing-services", CONSUMER_ELEC: "consumer-electronics",
  NETWORK: "network-support", SMART_HOME_OFFICE: "smart-home-office",
  HOME_SECURITY: "security-solutions", POWER_BACKUP: "power-backup",
  COPIER: "copier-printer-repair", PRINT_SUPPLIES: "print-supplies",
  APPLIANCE_INSTALL: "appliance-installation",
  // Raw AI codes (pre-normalization)
  ELECTRONICS: "consumer-electronics", SMARTHOME: "smart-home-office",
  SECURITY: "security-solutions", SUPPLIES: "print-supplies",
};

const getCategoryBookingRoute = (code: string): string =>
  `/book/${CATEGORY_ROUTE_SLUGS[code] || code.toLowerCase().replace(/_/g, "-")}`;

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  maintenance: Wrench, quote_expiry: FileText, quote_followup: FileText,
  warranty_expiry: Shield, next_best_service: Sparkles,
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
        setData({
          reminders: [], next_best_suggestions: [], quick_rebook: [],
          churn_risk: { score: 0, level: "low" }, rebook_likelihood: 0,
          stats: { total_bookings: 0, completed_bookings: 0, pending_quotes: 0, active_warranties: 0 },
        });
        return;
      }

      const { data: res, error: err } = await supabase.functions.invoke("retention-engine", {
        body: { mode: "customer", customer_id: userId },
      });
      if (err) throw new Error(err.message);
      const result = res as RetentionData;
      setData(result);

      // Track page view with reminder count
      track("reminder_viewed", {
        source_screen: "reminders_center",
        reminder_count: result.reminders.length,
        quick_rebook_count: result.quick_rebook.length,
        next_best_count: result.next_best_suggestions.length,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReminderClick = useCallback((r: Reminder) => {
    track("reminder_clicked", {
      reminder_type: r.type,
      category_code: r.category_code,
      linked_booking_id: r.linked_booking_id,
      linked_quote_id: r.linked_quote_id,
      source_screen: "reminders_center",
    });

    if (r.type === "quote_expiry" || r.type === "quote_followup") {
      track(r.type === "quote_expiry" ? "quote_followup_sent" : "quote_recovered", {
        category_code: r.category_code,
        linked_quote_id: r.linked_quote_id,
      });
    }
    if (r.type === "warranty_expiry") {
      track("renewal_reminder_sent", { category_code: r.category_code });
    }

    if (r.linked_quote_id) navigate(`/quote/${r.linked_booking_id}`);
    else if (r.category_code && r.category_code !== "DEVICE" && r.category_code !== "UNKNOWN")
      navigate(getCategoryBookingRoute(r.category_code));
  }, [navigate]);

  const handleQuickRebook = useCallback((rb: QuickRebook) => {
    track("quick_rebook_used", {
      category_code: rb.category_code,
      linked_booking_id: rb.booking_id,
      source_screen: "reminders_center",
      days_since_last: rb.days_ago,
    });
    navigate(getCategoryBookingRoute(rb.category_code));
  }, [navigate]);

  const handleNextBestClick = useCallback((s: NextBest) => {
    track("next_best_service_clicked", {
      category_code: s.category_code,
      source_category: s.source_category,
      action: s.action,
      source_screen: "reminders_center",
    });
    navigate(getCategoryBookingRoute(s.category_code));
  }, [navigate]);

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
                    <Card key={`urgent-${r.type}-${r.category_code}-${i}`} className="border-destructive/20 bg-destructive/5">
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
                              onClick={() => handleReminderClick(r)}
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
                    <Card key={`upcoming-${r.type}-${r.category_code}-${i}`}>
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
                              onClick={() => handleReminderClick(r)}
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
                      <div key={`rebook-${rb.booking_id}-${i}`} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
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
                          onClick={() => handleQuickRebook(rb)}
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
                  <Card key={`nbs-${s.category_code}-${i}`} className="border-primary/15 bg-primary/[0.02]">
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
                            onClick={() => handleNextBestClick(s)}
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
