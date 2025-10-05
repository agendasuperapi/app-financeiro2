import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.098fbad64e434a26aed29f249e0763e3',
  appName: 'app-financeiro2',
  webDir: 'dist',
  server: {
    url: 'https://098fbad6-4e43-4a26-aed2-9f249e0763e3.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
