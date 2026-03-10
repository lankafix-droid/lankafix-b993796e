import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-between gap-3 safe-area-top">
      <div className="flex items-center gap-2 text-sm font-medium">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>No internet connection</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </Button>
    </div>
  );
}
