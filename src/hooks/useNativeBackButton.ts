/**
 * Hook: registers Android hardware back-button inside React Router context.
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { registerBackButton, isNative } from "@/lib/capacitor";

export function useNativeBackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isNative) return;
    registerBackButton((delta) => {
      // On home page, registerBackButton already calls minimizeApp via canGoBack=false
      navigate(delta);
    });
  }, [navigate, pathname]);
}
