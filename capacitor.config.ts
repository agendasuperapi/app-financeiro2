import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.appfinanceiro',
  appName: 'App Financeiro',
  webDir: 'dist',
  // Remova o server.url para build de produção
  server: {
    url: 'https://098fbad6-4e43-4a26-aed2-9f249e0763e3.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#000000',
      overlay: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
