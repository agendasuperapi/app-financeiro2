// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Inicializar Firebase no service worker
firebase.initializeApp({
  apiKey: "AIzaSyBiBKG786eCJ9zfAIKmYDbRaoRD8okiXjc",
  authDomain: "appfinanceiro-22bd4.firebaseapp.com",
  projectId: "appfinanceiro-22bd4",
  storageBucket: "appfinanceiro-22bd4.firebasestorage.app",
  messagingSenderId: "385348841860",
  appId: "1:385348841860:web:cedf60cafffb48210f2dd1",
  measurementId: "G-XSG6T5VF4S"
});

const messaging = firebase.messaging();

// Handler para mensagens em background
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Mensagem recebida em background:', payload);
  
  const notificationTitle = payload.notification?.title || 'Nova notificação';
  const notificationOptions = {
    body: payload.notification?.body || 'Você tem uma nova mensagem',
    icon: payload.notification?.icon || '/app-icon.png',
    badge: '/app-icon.png',
    data: payload.data,
    tag: payload.data?.tag || 'default',
    requireInteraction: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
