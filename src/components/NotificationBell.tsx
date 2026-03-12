import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUnreadCount } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";

const NotificationBell = () => {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchCount = () => getUnreadCount().then(setCount);
    fetchCount();

    // Poll every 30s for new notifications
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  if (!userId) return null;

  return (
    <Link
      to="/notifications"
      className="relative p-2.5 rounded-xl hover:bg-muted transition-smooth text-muted-foreground hover:text-foreground touch-target"
      aria-label="Notifications"
    >
      <Bell className="w-[18px] h-[18px] md:w-4 md:h-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1 leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
};

export default NotificationBell;
