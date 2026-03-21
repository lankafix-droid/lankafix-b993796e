/**
 * Hook: registers Android hardware back-button inside React Router context.
 * Cleans up listener on unmount to prevent stacking.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isNative } from "@/lib/capacitor";

export function useNativeBackButton() {
  const navigate = useNavigate();
  // Use ref so the listener always sees the latest navigate without re-registering
  const navRef = useRef(navigate);
  navRef.current = navigate;

  useEffect(() => {
    if (!isNative) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            navRef.current(-1);
          } else {
            App.minimizeApp();
          }
        });
        cleanup = () => handle.remove();
      } catch {
        /* plugin not available */
      }
    })();

    return () => { cleanup?.(); };
  }, []); // register once
}
