import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.391027893cdf4fecbe913555106a96e7',
  appName: 'LankaFix',
  webDir: 'dist',
  server: {
    url: 'https://39102789-3cdf-4fec-be91-3555106a96e7.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0E4C92',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0E4C92',
    },
  },
};

export default config;
