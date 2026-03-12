import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, Clock, Wrench, FileText, Truck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";

const typeIcons: Record<string, React.ReactNode> = {
  booking_created: <Bell className="w-4 h-4 text-primary" />,
  technician_assigned: <Wrench className="w-4 h-4 text-accent-foreground" />,
  technician_en_route: <Truck className="w-4 h-4 text-warning" />,
  quote_submitted: <FileText className="w-4 h-4 text-secondary-foreground" />,
  quote_approved: <CheckCheck className="w-4 h-4 text-success" />,
  job_completed: <Star className="w-4 h-4 text-amber-500" />,
  new_job_offer: <Bell className="w-4 h-4 text-destructive" />,
  booking_assignment: <Wrench className="w-4 h-4 text-primary" />,
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-smooth">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-heading font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs text-muted-foreground">
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Auth gate */}
        {!userId && !loading && (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Sign in to view your notifications.</p>
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
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">You'll be notified about booking updates here.</p>
          </div>
        )}

        {/* List */}
        {!loading && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read_status && handleMarkRead(n.id)}
                className={`w-full text-left p-4 rounded-xl border transition-smooth ${
                  n.read_status
                    ? "bg-card border-border/30"
                    : "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.06]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-muted/60">
                    {typeIcons[n.type] || <Bell className="w-4 h-4 text-muted-foreground" />}
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
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground/50" />
                      <span className="text-[11px] text-muted-foreground/60">{timeAgo(n.created_at)}</span>
                      {n.booking_id && (
                        <Link
                          to={`/track/${n.booking_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-2 text-[11px] text-primary font-medium hover:underline"
                        >
                          View booking →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
