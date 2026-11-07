import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freecounter.app',
  appName: 'FreeCounter',
  webDir: 'dist/free-counter/browser',
  android: {
    backgroundColor: '#101218',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#101218',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#6C63FF',
    },
  },
};

export default config;
