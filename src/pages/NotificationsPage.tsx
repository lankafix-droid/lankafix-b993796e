import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Bell, CheckCheck, Clock, Wrench, FileText, Truck, Star,
  CreditCard, Shield, MapPin, MessageCircle, Smartphone, Mail, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  booking_created: { icon: <Bell className="w-4 h-4" />, color: "bg-primary/10 text-primary" },
  technician_assigned: { icon: <Wrench className="w-4 h-4" />, color: "bg-success/10 text-success" },
  technician_en_route: { icon: <Truck className="w-4 h-4" />, color: "bg-warning/10 text-warning" },
  quote_submitted: { icon: <FileText className="w-4 h-4" />, color: "bg-primary/10 text-primary" },
  quote_approved: { icon: <CheckCheck className="w-4 h-4" />, color: "bg-success/10 text-success" },
  job_completed: { icon: <Star className="w-4 h-4" />, color: "bg-success/10 text-success" },
  payment_received: { icon: <CreditCard className="w-4 h-4" />, color: "bg-success/10 text-success" },
  payment_due: { icon: <CreditCard className="w-4 h-4" />, color: "bg-warning/10 text-warning" },
  warranty_active: { icon: <Shield className="w-4 h-4" />, color: "bg-success/10 text-success" },
  reminder: { icon: <Clock className="w-4 h-4" />, color: "bg-muted text-muted-foreground" },
  new_job_offer: { icon: <AlertTriangle className="w-4 h-4" />, color: "bg-warning/10 text-warning" },
  booking_assignment: { icon: <Wrench className="w-4 h-4" />, color: "bg-primary/10 text-primary" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    getUserNotifications(100).then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, [userId]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_status: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs text-muted-foreground">
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification Channels — subtle readiness indicator */}
        <div className="bg-muted/30 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">Notification channels</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Bell className="w-3 h-3" /> Push
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Smartphone className="w-3 h-3" /> SMS
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Mail className="w-3 h-3" /> Email
            </div>
          </div>
        </div>

        {/* Auth gate */}
        {!userId && !loading && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Sign in to view notifications</p>
            <p className="text-xs text-muted-foreground mt-1">You'll receive updates about your bookings here.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && userId && notifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">You'll be notified about booking updates, quotes, payments, and warranty reminders.</p>
          </div>
        )}

        {/* List */}
        {!loading && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n, i) => {
              const config = typeConfig[n.type] || { icon: <Bell className="w-4 h-4" />, color: "bg-muted text-muted-foreground" };
              return (
                <motion.button
                  key={n.id}
                  onClick={() => !n.read_status && handleMarkRead(n.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    n.read_status
                      ? "bg-card border-border/30"
                      : "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.05]"
                  }`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold truncate ${n.read_status ? "text-foreground/80" : "text-foreground"}`}>
                          {n.title}
                        </span>
                        {!n.read_status && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground/60">{timeAgo(n.created_at)}</span>
                        {n.booking_id && (
                          <Link
                            to={`/tracker/${n.booking_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-2 text-[11px] text-primary font-medium hover:underline"
                          >
                            View booking →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
