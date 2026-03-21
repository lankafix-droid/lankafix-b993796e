/**
 * LankaFix – Capacitor Native Bridge
 * Handles Android back button, external links, status bar, and splash screen.
 */
import { Capacitor } from "@capacitor/core";

/** True when running inside a native Capacitor shell (not browser) */
export const isNative = Capacitor.isNativePlatform();

/**
 * Initialize all native plugins.
 * Safe to call on web — each block guards with `isNative`.
 */
export async function initNativeBridge() {
  if (!isNative) return;

  // ── Status Bar ──
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#0E4C92" });
  } catch {
    /* plugin not available */
  }

  // ── Hide Splash once app is interactive ──
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    /* plugin not available */
  }

  // ── Keyboard ──
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.setResizeMode?.({ mode: "body" as any });
  } catch {
    /* plugin not available */
  }
}

/**
 * Register Android hardware back-button handler.
 * - If browser history exists → go back
 * - If on home route → minimize app
 * - Otherwise → go back
 */
export async function registerBackButton(navigate: (delta: number) => void) {
  if (!isNative) return;

  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1);
      } else {
        // On home screen with no history — minimize the app instead of exiting
        App.minimizeApp();
      }
    });
  } catch {
    /* plugin not available */
  }
}

/**
 * Open an external URL in the system browser / appropriate app.
 * Falls back to window.open on web.
 */
export async function openExternal(url: string) {
  if (isNative) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch {
      /* fall through */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Check if a URL is an external link that should open outside the app.
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  // tel:, mailto:, whatsapp:, geo:, maps:, sms: are always external
  if (/^(tel:|mailto:|whatsapp:|sms:|geo:|comgooglemaps:|maps:)/.test(url)) return true;
  // http(s) links to other domains are external
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}
