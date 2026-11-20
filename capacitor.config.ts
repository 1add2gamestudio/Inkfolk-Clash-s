import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inkfolkclash.game',
  appName: 'Inkfolk Clash',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;