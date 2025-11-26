import { supabase } from '@/integrations/supabase/client';

// Função para converter chave VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerWebPushNotification() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications não suportadas');
    return false;
  }

  try {
    // Pedir permissão
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permissão de notificação negada');
      return false;
    }

    // Registrar service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Obter chave VAPID pública do edge function
    const { data: vapidKey } = await supabase.functions.invoke('get-vapid-key');
    
    if (!vapidKey?.publicKey) {
      console.error('Chave VAPID não encontrada');
      return false;
    }

    // Inscrever para push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey)
    });

    // Salvar token no banco
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const subscriptionJson = subscription.toJSON();
    await supabase.from('notification_tokens' as any).upsert({
      user_id: user.id,
      token: JSON.stringify(subscriptionJson),
      platform: 'web',
      endpoint: subscriptionJson.endpoint || '',
      p256dh: subscriptionJson.keys?.p256dh || '',
      auth: subscriptionJson.keys?.auth || ''
    });

    console.log('✅ Notificações web registradas com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao registrar notificações:', error);
    return false;
  }
}

export async function unregisterWebPushNotification() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return true;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remover token do banco
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('notification_tokens' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'web');
    }

    console.log('✅ Notificações web desativadas');
    return true;
  } catch (error) {
    console.error('❌ Erro ao desativar notificações:', error);
    return false;
  }
}

export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}
