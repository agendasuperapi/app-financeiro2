// Service Worker para APP Financeiro
// Configurado para Firebase Cloud Messaging (FCM)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const CACHE_NAME = 'app-financeiro-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.css',
  '/src/index.css'
];

// Cache management
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Firebase Cloud Messaging (FCM) - Background messages
// Este código será executado quando o app estiver em background
// IMPORTANTE: Configure o Firebase no service worker também
// Você precisará adicionar a configuração do Firebase aqui

// Handler para mensagens FCM recebidas em background
self.addEventListener('push', function(event) {
  console.log('📬 Push notification recebida no service worker');
  
  let notificationData = {
    title: 'Lembrete Financeiro',
    body: 'Você tem um lembrete pendente',
    icon: '/app-icon.png',
    badge: '/app-icon.png',
    tag: 'default',
    data: {},
    requireInteraction: false
  };

  // Tentar parsear os dados do FCM
  if (event.data) {
    try {
      const fcmData = event.data.json();
      console.log('📋 Dados FCM recebidos:', fcmData);
      
      // FCM envia dados em formato específico
      if (fcmData.notification) {
        notificationData.title = fcmData.notification.title || notificationData.title;
        notificationData.body = fcmData.notification.body || notificationData.body;
        notificationData.icon = fcmData.notification.icon || notificationData.icon;
      }
      
      if (fcmData.data) {
        notificationData.data = fcmData.data;
        notificationData.tag = fcmData.data.tag || fcmData.data.reminderId || 'default';
      }
    } catch (error) {
      console.error('❌ Erro ao parsear dados FCM:', error);
      // Tentar como texto simples
      try {
        const textData = event.data.text();
        const parsed = JSON.parse(textData);
        if (parsed.title) notificationData.title = parsed.title;
        if (parsed.body) notificationData.body = parsed.body;
        if (parsed.data) notificationData.data = parsed.data;
      } catch (e) {
        console.error('❌ Erro ao parsear como texto:', e);
      }
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: false,
    actions: [
      { action: 'view', title: 'Ver detalhes' },
      { action: 'dismiss', title: 'Dispensar' }
    ],
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Handler para clique na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('🔔 Notificação clicada:', event.notification);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.click_action || 
                    event.notification.data?.url || 
                    '/lembrar';
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Tentar focar em uma janela existente
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // Se não encontrou, abrir nova janela
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
  // Se a ação foi 'dismiss', apenas fechar a notificação (já feito acima)
});

// Handler para mensagens FCM quando o app está em foreground
// Isso é gerenciado pelo código do frontend, mas podemos adicionar aqui também
self.addEventListener('message', function(event) {
  console.log('📨 Mensagem recebida no service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
