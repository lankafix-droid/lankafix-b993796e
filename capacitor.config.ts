import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lankafix.app',
  appName: 'LankaFix',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false, // We hide manually after native bridge init
      backgroundColor: '#0E4C92',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0E4C92',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Internal pilot build — v5 / 1.4.0-pilot
    versionCode: 5,
    versionName: '1.4.0-pilot',
    // Keep links inside the app
    appendUserAgent: 'LankaFix/Android',
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
  },
};

export default config;
