/**
 * LankaFix – useExternalLinks
 * Intercepts clicks on external links (tel:, whatsapp:, http external)
 * and opens them via Capacitor Browser plugin in native, or window.open on web.
 */
import { useEffect } from "react";
import { isExternalUrl, openExternal, isNative } from "@/lib/capacitor";

export function useExternalLinks() {
  useEffect(() => {
    if (!isNative) return;

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (isExternalUrl(href)) {
        e.preventDefault();
        e.stopPropagation();
        openExternal(href);
      }
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);
}
