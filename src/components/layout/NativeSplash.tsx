/**
 * LankaFix – In-App Splash Screen
 * Shows the branded splash while the app initializes.
 * Fades out automatically after native bridge is ready.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isNative, initNativeBridge } from "@/lib/capacitor";

export default function NativeSplash({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isNative); // skip splash on web

  useEffect(() => {
    if (!isNative) return;
    initNativeBridge().finally(() => {
      // Small delay so splash feels intentional, not flickery
      setTimeout(() => setReady(true), 400);
    });
  }, []);

  return (
    <>
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(160deg, #0E4C92 0%, #1A9C8B 60%, #2FAE66 100%)" }}
          >
            <div className="flex flex-col items-center gap-5">
              {/* Logo mark */}
              <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <span className="text-white font-heading font-extrabold text-3xl tracking-tight">L</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <h1 className="text-white font-heading font-bold text-2xl tracking-tight">LankaFix</h1>
                <p className="text-white/70 text-xs font-medium">Smart Repair & Technical Services</p>
              </div>
              {/* Subtle spinner */}
              <div className="mt-4 w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {ready && children}
    </>
  );
}
