/**
 * Notification Preferences — Consumer alert settings persisted to DB.
 * Falls back to localStorage for unauthenticated users.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bell, MessageSquare, Mail, Smartphone, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  icon: typeof Bell;
  enabled: boolean;
}

const DEFAULT_PREFS: NotificationPref[] = [
  { key: "booking_updates",   label: "Booking Updates",    description: "Status changes, technician assignments, and arrival alerts",   icon: Bell,          enabled: true },
  { key: "quote_alerts",      label: "Quote Alerts",       description: "When a quote is ready for your review or approval",           icon: MessageSquare, enabled: true },
  { key: "reminders",         label: "Service Reminders",  description: "Upcoming appointments and maintenance due dates",             icon: Smartphone,    enabled: true },
  { key: "onboarding_status", label: "Onboarding Updates", description: "Partner application status and verification progress",        icon: Shield,        enabled: true },
  { key: "promotions",        label: "Offers & Tips",      description: "Seasonal offers, maintenance tips, and new services",         icon: Mail,          enabled: false },
];

const PREF_KEYS = ["booking_updates", "quote_alerts", "reminders", "onboarding_status", "promotions"] as const;

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPref[]>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences — DB if authenticated, localStorage fallback
  useEffect(() => {
    track("notification_prefs_view");

    const loadPrefs = async () => {
      if (user) {
        const { data } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setPrefs(prev => prev.map(p => ({
            ...p,
            enabled: (data as any)[p.key] ?? p.enabled,
          })));
        }
      } else {
        const saved = localStorage.getItem("lf_notification_prefs");
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Record<string, boolean>;
            setPrefs(prev => prev.map(p => ({ ...p, enabled: parsed[p.key] ?? p.enabled })));
          } catch { /* ignore */ }
        }
      }
      setLoading(false);
    };

    loadPrefs();
  }, [user]);

  const toggle = useCallback(async (key: string) => {
    setPrefs(prev => {
      const next = prev.map(p => p.key === key ? { ...p, enabled: !p.enabled } : p);

      // Persist
      const map = Object.fromEntries(next.map(p => [p.key, p.enabled]));
      localStorage.setItem("lf_notification_prefs", JSON.stringify(map));

      if (user) {
        supabase
          .from("notification_preferences")
          .upsert({
            user_id: user.id,
            booking_updates: map["booking_updates"] ?? true,
            quote_alerts: map["quote_alerts"] ?? true,
            reminders: map["reminders"] ?? true,
            onboarding_status: map["onboarding_status"] ?? true,
            promotions: map["promotions"] ?? false,
          } as any, { onConflict: "user_id" })
          .then(({ error }) => {
            if (error) console.error("Failed to save preferences:", error);
          });
      }

      track("notification_pref_toggle", { key, enabled: !prev.find(p => p.key === key)?.enabled });
      return next;
    });

    toast.success("Preference updated");
  }, [user]);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24 space-y-5">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Notification Preferences</h1>
              <p className="text-xs text-muted-foreground">
                {user ? "Your preferences are saved to your account" : "Sign in to save preferences across devices"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y divide-border/40">
                {prefs.map(pref => {
                  const Icon = pref.icon;
                  return (
                    <div key={pref.key} className="flex items-center gap-4 p-4">
                      <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{pref.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">{pref.description}</p>
                      </div>
                      <Switch checked={pref.enabled} onCheckedChange={() => toggle(pref.key)} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <div className="p-4 rounded-2xl bg-muted/30 border border-border/30">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <Shield className="w-3.5 h-3.5 inline mr-1 text-primary" />
              Critical safety and payment alerts are always sent regardless of your preferences. We'll never share your contact details with third parties.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
