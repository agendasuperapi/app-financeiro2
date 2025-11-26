import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBiBKG786eCJ9zfAIKmYDbRaoRD8okiXjc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "appfinanceiro-22bd4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "appfinanceiro-22bd4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "appfinanceiro-22bd4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "385348841860",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:385348841860:web:cedf60cafffb48210f2dd1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XSG6T5VF4S"
};

// VAPID Key para Web Push via FCM
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BIH1RGUAJcAI2l-pb7gAo5vVwXSZuuT572HmzCDCxTQXpWSoPex9e66DSBmnTvEzX9Ha7A3WII9uC9JRG9IVriQ";

// Inicializar Firebase apenas uma vez
let app: FirebaseApp;
let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
  // Inicializar app apenas no cliente
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Inicializar messaging apenas no cliente e se o navegador suportar
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('⚠️ Firebase Messaging não disponível:', error);
    // Messaging não está disponível (pode ser SSR ou navegador não suporta)
  }
}

export { app, messaging };

/**
 * Obter token FCM para notificações push
 */
export async function getFCMToken(): Promise<string | null> {
  if (!messaging) {
    console.warn('⚠️ Firebase Messaging não está disponível');
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });
    
    if (token) {
      console.log('✅ Token FCM obtido:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('⚠️ Nenhum token FCM disponível. Verifique se as permissões foram concedidas.');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao obter token FCM:', error);
    return null;
  }
}

/**
 * Configurar listener para mensagens recebidas quando o app está em foreground
 */
export function setupForegroundMessageListener(callback: (payload: any) => void) {
  if (!messaging) {
    console.warn('⚠️ Firebase Messaging não está disponível');
    return;
  }

  onMessage(messaging, (payload) => {
    console.log('📬 Mensagem recebida em foreground:', payload);
    callback(payload);
  });
}

