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
    console.log('❌ Push notifications não suportadas');
    return false;
  }

  try {
    console.log('🔔 Iniciando registro de notificações web...');
    
    // Pedir permissão
    const permission = await Notification.requestPermission();
    console.log('📱 Permissão:', permission);
    if (permission !== 'granted') {
      console.log('❌ Permissão de notificação negada');
      return false;
    }

    // Registrar service worker
    console.log('⚙️ Registrando service worker...');
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    console.log('✅ Service worker registrado');

    // Obter chave VAPID pública do edge function
    console.log('🔑 Buscando chave VAPID...');
    const { data: vapidKey, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
    
    if (vapidError) {
      console.error('❌ Erro ao buscar chave VAPID:', vapidError);
      return false;
    }
    
    if (!vapidKey?.publicKey) {
      console.error('❌ Chave VAPID não encontrada');
      return false;
    }
    console.log('✅ Chave VAPID obtida');

    // Inscrever para push
    console.log('📝 Inscrevendo para push...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey)
    });
    console.log('✅ Inscrição criada');

    // Salvar token no banco
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return false;
    }

    const subscriptionJson = subscription.toJSON();
    console.log('💾 Salvando token no banco...');
    const { error: saveError } = await supabase.from('notification_tokens' as any).upsert({
      user_id: user.id,
      token: JSON.stringify(subscriptionJson),
      platform: 'web',
      endpoint: subscriptionJson.endpoint || '',
      p256dh: subscriptionJson.keys?.p256dh || '',
      auth: subscriptionJson.keys?.auth || ''
    });

    if (saveError) {
      console.error('❌ Erro ao salvar token:', saveError);
      return false;
    }

    console.log('✅ Notificações web registradas com sucesso!');
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

export async function hasTokenSaved(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('notification_tokens' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'web')
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

export async function sendTestNotification() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return false;
    }

    console.log('🧪 Enviando notificação de teste para userId:', user.id);
    console.log('🧪 Dados completos do usuário:', user);
    
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId: user.id,
        title: '🧪 Teste de Notificação',
        body: 'Se você viu isso, suas notificações estão funcionando! 🎉',
        data: { test: true }
      }
    });

    if (error) {
      console.error('❌ Erro ao enviar notificação de teste:', error);
      return false;
    }

    console.log('✅ Resposta da função send-notification:', data);
    console.log('✅ Notificação de teste enviada');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de teste:', error);
    return false;
  }
}
