// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// URL base do Supabase para chamadas de API
const SUPABASE_URL = 'https://gpttodmpflpzhbgzagcc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHRvZG1wZmxwemhiZ3phZ2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzU2MTcsImV4cCI6MjA3MDg1MTYxN30.Ro2k_slVwV7hsGDM1YNcNP3csi876LPuAwFSBpxJN2I';

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
    requireInteraction: payload.data?.type === 'scheduled_transaction'
  };

  // Adicionar ações para agendamentos
  if (payload.data?.type === 'scheduled_transaction') {
    notificationOptions.actions = [
      { action: 'mark_paid', title: '✅ Marcar como pago' },
      { action: 'view', title: '👁️ Ver detalhes' }
    ];
    notificationOptions.tag = `agendamento-${payload.data.transactionId}`;
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para cliques em notificações
self.addEventListener('notificationclick', async (event) => {
  console.log('🖱️ Notificação clicada:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();

  // Ação: Marcar como pago
  if (action === 'mark_paid' && data.transactionId) {
    console.log('📝 Marcando transação como paga:', data.transactionId);
    
    event.waitUntil(
      markAsPaid(data.transactionId)
        .then(() => {
          console.log('✅ Transação marcada como paga');
          // Mostrar notificação de confirmação
          return self.registration.showNotification('✅ Pago!', {
            body: 'Transação marcada como paga com sucesso.',
            icon: '/app-icon.png',
            tag: 'confirmacao',
            requireInteraction: false
          });
        })
        .catch((error) => {
          console.error('❌ Erro ao marcar como pago:', error);
          return self.registration.showNotification('❌ Erro', {
            body: 'Não foi possível marcar como pago. Tente novamente.',
            icon: '/app-icon.png',
            tag: 'erro',
            requireInteraction: false
          });
        })
    );
    return;
  }

  // Ação: Ver detalhes ou clique na notificação
  if (action === 'view' || !action) {
    let url = '/';
    
    if (data.type === 'scheduled_transaction') {
      url = '/schedule';
    } else if (data.type === 'reminder') {
      url = '/lembrar';
    }

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Tentar focar em uma janela existente
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.navigate(url);
              return client.focus();
            }
          }
          // Abrir nova janela se não houver nenhuma
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Função para chamar a API de marcar como pago
async function markAsPaid(transactionId) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/mark-as-paid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ transactionId })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao marcar como pago: ${error}`);
  }

  return response.json();
}
