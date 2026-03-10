import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground safe-area-top"
        >
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-destructive-foreground/10 flex items-center justify-center">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">No connection</p>
                <p className="text-[11px] opacity-80">Check your internet and try again</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10 rounded-lg"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
